import { mkdir, open, rm } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";

export const SITE_RESTORE_SCHEMA = "wpsc.site-restore";
export const SITE_RESTORE_VERSION = 1;

export default function createSiteRestoreService(options = {}) {
  const backupService = options.backupService;
  const registry = options.registry;
  const repository = options.repository;
  if (!backupService?.read || !registry?.update || !repository?.writeMetadata) throw new TypeError("Site Restore Service requires Backup Service, Site Registry and Site Repository.");
  const restorers = options.restorers ?? {};
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function plan(siteId, backupId) {
    const source = await backupService.read(siteId, backupId);
    if (!source.ok) return source;
    const backup = source.backup;
    const validation = validateBackup(siteId, backup);
    if (!validation.ok) return failure(validation.code, validation.message);
    return success({
      plan: deepFreeze({
        backupId,
        operations: [
          "metadata.restore",
          "settings.restore",
          "source_metadata.restore",
          "registry.restore",
          ...Object.keys(restorers).sort().map((name) => `state.${name}.restore`)
        ].filter((operation) => shouldRestore(operation, backup.state)),
        schema: SITE_RESTORE_SCHEMA,
        schemaVersion: SITE_RESTORE_VERSION,
        siteId
      })
    });
  }

  async function restore(siteId, backupId) {
    const planned = await plan(siteId, backupId);
    if (!planned.ok) return planned;
    const release = await acquireLock(siteId);
    if (!release) return failure("restore.lock.active", "A restore is already active for this Site.");
    const checkpoints = [{ name: "restore.started", timestamp: now() }];
    try {
      const loaded = await backupService.read(siteId, backupId);
      if (!loaded.ok) return loaded;
      const state = loaded.backup.state;
      await repository.writeMetadata(siteId, state.metadata);
      checkpoints.push({ name: "metadata.restored", timestamp: now() });
      if (state.settings) { await repository.writeSettings(siteId, state.settings); checkpoints.push({ name: "settings.restored", timestamp: now() }); }
      if (state.sourceMetadata) { await repository.writeSourceMetadata(siteId, state.sourceMetadata); checkpoints.push({ name: "source_metadata.restored", timestamp: now() }); }
      if (state.site) {
        await registry.update(siteId, {
          domains: state.site.domains,
          environment: state.site.environment,
          runtimeConfigRef: state.site.runtimeConfigRef,
          status: state.site.status
        });
        checkpoints.push({ name: "registry.restored", timestamp: now() });
      }
      for (const [name, restorer] of Object.entries(restorers).sort(([first], [second]) => first.localeCompare(second))) {
        if (state[name] === null || state[name] === undefined || typeof restorer !== "function") continue;
        await restorer(siteId, state[name]);
        checkpoints.push({ name: `state.${name}.restored`, timestamp: now() });
      }
      const verification = await verifyRecoveredState(siteId, state);
      if (!verification.ok) return failure("restore.verification.failed", verification.message, checkpoints);
      checkpoints.push({ name: "restore.verified", timestamp: now() });
      return success({ checkpoints, plan: planned.plan, restoredAt: now(), siteId });
    } catch (error) {
      checkpoints.push({ name: "restore.failed", timestamp: now() });
      return failure("restore.execution.failed", error.message, checkpoints);
    } finally {
      await release();
    }
  }

  async function verifyRecoveredState(siteId, state) {
    const metadata = await repository.readMetadata(siteId);
    if (JSON.stringify(metadata) !== JSON.stringify(state.metadata)) return { ok: false, message: "Site metadata does not match the verified backup." };
    if (state.settings && JSON.stringify(await repository.readSettings(siteId)) !== JSON.stringify(state.settings)) return { ok: false, message: "Site settings do not match the verified backup." };
    if (state.sourceMetadata && JSON.stringify(await repository.readSourceMetadata(siteId)) !== JSON.stringify(state.sourceMetadata)) return { ok: false, message: "Source metadata does not match the verified backup." };
    return { ok: true };
  }

  async function acquireLock(siteId) {
    const lockPath = path.join(repository.resolveSiteRoot(siteId), "storage", "restore.lock");
    try {
      await mkdir(path.dirname(lockPath), { recursive: true });
      const handle = await open(lockPath, "wx");
      await handle.writeFile(`${JSON.stringify({ siteId, startedAt: now() })}\n`);
      await handle.close();
      return async () => rm(lockPath, { force: true });
    } catch (error) { if (error.code === "EEXIST") return null; throw error; }
  }

  return Object.freeze({ plan, restore });
}

function validateBackup(siteId, backup) {
  if (backup.siteId !== siteId) return { code: "restore.site.mismatch", message: "Backup cannot be restored to a different Site.", ok: false };
  if (!backup.state?.metadata || !backup.state?.site) return { code: "restore.backup.invalid", message: "Backup does not contain required operational state.", ok: false };
  return { ok: true };
}
function shouldRestore(operation, state) { if (operation === "settings.restore") return Boolean(state.settings); if (operation === "source_metadata.restore") return Boolean(state.sourceMetadata); if (operation.startsWith("state.")) return state[operation.split(".")[1]] !== null && state[operation.split(".")[1]] !== undefined; return true; }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message, checkpoints = []) { return deepFreeze({ checkpoints, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
