import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../../shared/deepFreeze.js";
import { canTransition, CoreUpdateState, createCoreUpdateState } from "./coreUpdateContract.js";

export default function createCoreUpdateService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function" ? options.createId : () => `update-${Date.now()}`;
  const stateFile = path.join(workspaceDir, "storage", "updates", "core-update.json");
  const lockFile = path.join(workspaceDir, "storage", "updates", "core-update.lock");
  const historyLimit = Number.isInteger(options.historyLimit) ? options.historyLimit : 100;

  async function status() { return success({ update: await readState() }); }

  async function start(input = {}) {
    return withLock(async () => {
      const current = await readState();
      if (![CoreUpdateState.IDLE, CoreUpdateState.COMPLETED, CoreUpdateState.ROLLED_BACK].includes(current.state)) return failure("core_update.lifecycle.active", `Core Update is already ${current.state}.`, { update: current });
      const update = createCoreUpdateState({ checkpoints: [], history: [], plan: input.plan ?? null, revision: current.revision + 1, state: CoreUpdateState.IDLE, updateId: input.updateId ?? createId(), updatedAt: now() });
      await writeState(update);
      return advance(update, CoreUpdateState.CHECKING, input);
    });
  }

  async function transition(input = {}) {
    return withLock(async () => advance(await readState(), input.state, input));
  }

  async function advance(current, target, input = {}) {
    if (!Object.values(CoreUpdateState).includes(target)) return failure("core_update.state.invalid", "Core Update target state is invalid.", { update: current });
    if (!canTransition(current.state, target)) return failure("core_update.transition.invalid", `Cannot transition Core Update from ${current.state} to ${target}.`, { update: current });
    const timestamp = now();
    const checkpoint = deepFreeze({ at: timestamp, from: current.state, revision: current.revision + 1, state: target });
    const event = deepFreeze({ at: timestamp, error: target === CoreUpdateState.FAILED ? input.error ?? "Core Update failed." : null, event: "state.transition", from: current.state, reason: input.reason ?? null, revision: current.revision + 1, state: target });
    const update = createCoreUpdateState({
      ...current,
      checkpoints: [...current.checkpoints, checkpoint],
      history: [...current.history, event].slice(-historyLimit),
      lastError: target === CoreUpdateState.FAILED ? input.error ?? "Core Update failed." : current.lastError,
      revision: current.revision + 1,
      state: target,
      updatedAt: timestamp
    });
    await writeState(update);
    return success({ update });
  }

  async function resume() {
    const update = await readState();
    const terminal = [CoreUpdateState.IDLE, CoreUpdateState.COMPLETED, CoreUpdateState.ROLLED_BACK].includes(update.state);
    return success({ nextAction: nextAction(update.state), recoveryRequired: [CoreUpdateState.FAILED, CoreUpdateState.ROLLBACK].includes(update.state), resumable: !terminal, update });
  }

  async function readState() {
    try { return createCoreUpdateState(JSON.parse(await readFile(stateFile, "utf8"))); }
    catch (error) { if (error.code === "ENOENT") return createCoreUpdateState(); throw error; }
  }
  async function writeState(update) {
    await mkdir(path.dirname(stateFile), { recursive: true });
    const temporary = `${stateFile}.${update.revision}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(update, null, 2)}\n`, "utf8");
    await rename(temporary, stateFile);
  }
  async function withLock(action) {
    await mkdir(path.dirname(lockFile), { recursive: true });
    let handle;
    try { handle = await open(lockFile, "wx"); }
    catch (error) {
      if (error.code === "EEXIST") return failure("core_update.lock.active", "Another Core Update lifecycle operation is active.", { update: await readState() });
      throw error;
    }
    try { return await action(); }
    finally { await handle.close(); await unlink(lockFile).catch(() => {}); }
  }
  return Object.freeze({ resume, start, status, transition });
}

function nextAction(state) {
  return ({ CHECKING: "check-release", PLANNED: "download-package", DOWNLOADING: "verify-package", VERIFIED: "backup", BACKING_UP: "stage", STAGING: "migrate", MIGRATING: "validate", VALIDATING: "activate", ACTIVATING: "health-check", HEALTH_CHECK: "complete", FAILED: "rollback", ROLLBACK: "complete-rollback" })[state] ?? null;
}

function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message, data = {}) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
