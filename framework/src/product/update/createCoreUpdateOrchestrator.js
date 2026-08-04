import { CoreUpdateState } from "./coreUpdateContract.js";

export default function createCoreUpdateOrchestrator(options = {}) {
  const services = options.services ?? {};
  for (const name of ["lifecycle", "planner", "verifier", "recovery", "staging", "migration", "activation", "health"]) if (!services[name]) throw new TypeError(`Core Update Orchestrator requires ${name} service.`);

  async function run(input = {}) {
    const planned = await services.planner.plan(input);
    if (!planned.ok) return planned;
    const started = await services.lifecycle.start({ plan: planned.plan, updateId: input.updateId });
    if (!started.ok) return started;
    try {
      await advance(CoreUpdateState.PLANNED);
      await advance(CoreUpdateState.DOWNLOADING);
      const verified = await services.verifier.verify(input.package);
      if (!verified.ok) return fail(verified);
      await advance(CoreUpdateState.VERIFIED);
      await advance(CoreUpdateState.BACKING_UP);
      const recovery = await services.recovery.create({ recoveryId: input.recoveryId });
      if (!recovery.ok) return fail(recovery);
      await advance(CoreUpdateState.STAGING);
      const staged = await services.staging.stage({ packageContent: input.package?.content, packageDir: input.packageDir, packageId: planned.plan.package.packageId, version: planned.plan.package.version });
      if (!staged.ok) return fail(staged);
      await advance(CoreUpdateState.MIGRATING);
      const migrated = await services.migration.validate({ fromVersion: planned.plan.currentVersion, validation: input.validation, version: planned.plan.package.version });
      if (!migrated.ok) return fail(migrated);
      await advance(CoreUpdateState.VALIDATING);
      await advance(CoreUpdateState.ACTIVATING);
      const activated = await services.activation.activate(planned.plan.package.version);
      if (!activated.ok) return fail(activated);
      await advance(CoreUpdateState.HEALTH_CHECK);
      const health = await services.health.verify({ recoveryId: input.recoveryId });
      if (health.state === "COMPLETED") { await advance(CoreUpdateState.COMPLETED); return { activated, health, ok: true, plan: planned.plan }; }
      await advance(CoreUpdateState.FAILED, "Post-activation health failed.");
      await advance(CoreUpdateState.ROLLBACK);
      if (health.state === "ROLLED_BACK") { await advance(CoreUpdateState.ROLLED_BACK); return { health, ok: false, rolledBack: true }; }
      return { health, ok: false, recoveryRequired: true };
    } catch (error) { return fail({ diagnostics: { errors: [{ message: error.message }] }, ok: false }); }
  }
  async function check() { return services.release?.check ? services.release.check() : { diagnostics: { errors: [{ code: "core_update.release.unavailable", message: "Release discovery is unavailable.", severity: "error" }], warnings: [] }, ok: false }; }
  async function plan(input = {}) { return services.planner.plan(input); }
  async function status() { return services.lifecycle.status(); }
  async function history() { const current = await services.lifecycle.status(); return { diagnostics: current.diagnostics, history: current.update?.history ?? [], ok: current.ok, updateId: current.update?.updateId ?? null }; }
  async function advance(state, error) { const result = await services.lifecycle.transition({ error, state }); if (!result.ok) throw new Error(result.diagnostics.errors[0].message); return result; }
  async function fail(result) { await services.lifecycle.transition({ error: result.diagnostics?.errors?.[0]?.message ?? "Core Update failed.", state: CoreUpdateState.FAILED }); return result; }
  return Object.freeze({ check, history, plan, run, status });
}
