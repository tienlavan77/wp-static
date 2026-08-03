import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../../shared/deepFreeze.js";

export const CoreUpdateHealthState = Object.freeze({ COMPLETED: "COMPLETED", HEALTH_CHECK: "HEALTH_CHECK", RECOVERY_REQUIRED: "RECOVERY_REQUIRED", ROLLBACK: "ROLLBACK", ROLLED_BACK: "ROLLED_BACK" });
export const REQUIRED_CORE_HEALTH_CHECKS = Object.freeze(["runtime", "scheduler", "queue", "dispatcher", "buildIntegration"]);

export default function createCoreUpdateHealthService(options = {}) {
  const checks = options.checks ?? {};
  const recovery = options.recovery;
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const stateFile = path.join(workspaceDir, "storage", "updates", "health.json");
  const now = options.now ?? (() => new Date().toISOString());
  if (!recovery?.restore) throw new TypeError("Core Update Health requires Recovery Service.");
  for (const name of REQUIRED_CORE_HEALTH_CHECKS) if (typeof checks[name] !== "function") throw new TypeError(`Core Update Health requires ${name} check.`);

  async function verify(input = {}) {
    const existing = await readState();
    if (existing?.state === CoreUpdateHealthState.ROLLED_BACK && existing.recoveryId === input.recoveryId) return success(existing);
    await persist({ recoveryId: input.recoveryId, results: [], state: CoreUpdateHealthState.HEALTH_CHECK });
    const results = [];
    for (const name of REQUIRED_CORE_HEALTH_CHECKS) {
      try { const result = await checks[name](input); results.push({ name, ok: result?.ok !== false }); }
      catch (error) { results.push({ message: error.message, name, ok: false }); }
    }
    if (results.every((result) => result.ok)) return finish({ recoveryId: input.recoveryId, results, rolledBack: false, state: CoreUpdateHealthState.COMPLETED });
    await persist({ recoveryId: input.recoveryId, results, state: CoreUpdateHealthState.ROLLBACK });
    return rollback(input.recoveryId, results);
  }

  async function rollback(recoveryId, results = []) {
    try {
      const restored = await recovery.restore(recoveryId);
      if (restored?.ok === false) throw new Error("Recovery Service rejected rollback.");
      return finish({ recoveryId, results, rolledBack: true, state: CoreUpdateHealthState.ROLLED_BACK });
    } catch (error) {
      const record = await persist({ error: error.message, recoveryId, results, state: CoreUpdateHealthState.RECOVERY_REQUIRED });
      return failure("core_update.health.rollback.failed", "Health check failed and automatic rollback requires recovery.", record);
    }
  }

  async function resume() {
    const state = await readState();
    if (!state) return failure("core_update.health.state.missing", "No health lifecycle state is available.", null);
    if (state.state === CoreUpdateHealthState.ROLLBACK) return rollback(state.recoveryId, state.results);
    if (state.state === CoreUpdateHealthState.HEALTH_CHECK) return verify({ recoveryId: state.recoveryId });
    return success(state);
  }
  async function status() { return success(await readState()); }
  async function finish(record) { return success(await persist(record)); }
  async function persist(record) { const value = deepFreeze({ ...record, schema: "wpsc.core-update-health", schemaVersion: 1, updatedAt: now() }); await mkdir(path.dirname(stateFile), { recursive: true }); const temporary = `${stateFile}.${process.pid}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`); await rename(temporary, stateFile); return value; }
  async function readState() { try { return deepFreeze(JSON.parse(await readFile(stateFile, "utf8"))); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
  return Object.freeze({ resume, status, verify });
}

function success(record) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...record }); }
function failure(code, message, record) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...(record ?? {}) }); }
