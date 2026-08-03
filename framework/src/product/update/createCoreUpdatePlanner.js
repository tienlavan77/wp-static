import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdatePlanner(options = {}) {
  const releaseService = options.releaseService;
  const packageVerifier = options.packageVerifier;
  const migrationService = options.migrationService;
  const configurationValidator = options.configurationValidator;
  if (!releaseService?.check || !packageVerifier?.verify || !migrationService?.plan || !configurationValidator?.validate) throw new TypeError("Core Update Planner requires release, verification, migration and configuration services.");
  async function plan(input = {}) {
    const release = await releaseService.check();
    if (!release.ok || !release.available) return failure("core_update.plan.release.unavailable", "No verified newer Core release is available.");
    const verified = await packageVerifier.verify(input.package ?? {});
    if (!verified.ok) return failure("core_update.plan.package.unverified", "Target package is not verified.", { verification: verified });
    const migrations = await migrationService.plan({ fromVersion: release.currentVersion, toVersion: release.available.version });
    if (!migrations.ok) return failure("core_update.plan.migration.unavailable", "No compatible migration plan is available.", { migrations });
    const configuration = await configurationValidator.validate(input.validation ?? {});
    if (!configuration.ok) return failure("core_update.plan.configuration.invalid", "Configuration validation failed.", { configuration });
    return success({ plan: deepFreeze({ activation: "required", backup: "required", currentVersion: release.currentVersion, migrations: migrations.plan.migrations, package: { packageId: release.available.packageId, verified: true, version: release.available.version }, rollback: "available", schema: "wpsc.core-update-plan", schemaVersion: 1, secrets: "references-only", sites: "preserved" }) });
  }
  return Object.freeze({ plan });
}
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message, data = {}) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
