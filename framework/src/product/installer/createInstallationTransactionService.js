import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import createAtomicJsonStore from "./createAtomicJsonStore.js";
import { canTransitionInstallation, createInstallationRecoveryScope, createInstallationTransaction, InstallationTransactionState } from "./installationContract.js";

export default function createInstallationTransactionService(options = {}) {
  const workspace = path.resolve(options.workspace ?? process.cwd());
  const store = options.store ?? createAtomicJsonStore(path.join(workspace, "storage", "installer", "transaction.json"), options.storeOptions);
  const lockPath = path.join(workspace, "storage", "installer", "transaction.lock");
  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => `install-${Date.now()}`);
  const recoveryHandler = options.recoveryHandler ?? (async () => {});
  const mutationHandlers = options.mutationHandlers ?? {};
  const staleAfterMs = options.staleAfterMs ?? 300000;

  async function start(input = {}) {
    return locked(async () => {
      try {
        const current = createInstallationTransaction(await store.read());
        if (![InstallationTransactionState.COMPLETED, InstallationTransactionState.ROLLED_BACK].includes(current.state)) {
          return failure("installation.transaction.active", `Installation transaction ${current.transactionId} is still ${current.state}.`, current);
        }
      } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (!input.ownerId) return failure("installation.owner.required", "Installation transaction owner is required.");
      const transaction = createInstallationTransaction({ fence: 1, installationId: input.installationId, ownerId: input.ownerId, plan: input.plan ?? null, revision: 0, state: InstallationTransactionState.PLANNING, transactionId: input.transactionId ?? createId(), updatedAt: now() });
      await store.write(transaction);
      return success({ transaction });
    });
  }
  async function transition(input = {}) {
    return locked(async () => {
      const current = createInstallationTransaction(await store.read());
      const ownership = validateOwnership(current, input);
      if (ownership) return ownership;
      if (input.expectedRevision !== undefined && input.expectedRevision !== current.revision) return failure("installation.revision.stale", "Installation transaction revision is stale.", current);
      if (!canTransitionInstallation(current.state, input.state)) return failure("installation.transition.invalid", `Cannot transition Installation from ${current.state} to ${input.state}.`, current);
      const timestamp = now();
      const transaction = createInstallationTransaction({
        ...current,
        checkpoints: [...current.checkpoints, { at: timestamp, from: current.state, revision: current.revision + 1, state: input.state }],
        lastError: input.state === InstallationTransactionState.FAILED ? safeFailure(input.error) : current.lastError,
        recovery: input.state === InstallationTransactionState.RECOVERING ? createInstallationRecoveryScope(input.recovery) : current.recovery,
        revision: current.revision + 1,
        state: input.state,
        updatedAt: timestamp
      });
      await store.write(transaction);
      return success({ transaction });
    });
  }
  async function status() { return success({ transaction: createInstallationTransaction(await store.read()) }); }
  async function resume() { const transaction = (await status()).transaction; const stale = isStale(transaction); return success({ nextAction: transaction.activeOperation ? "recover-external-operation" : stale ? "claim-stale-transaction" : nextAction(transaction.state), recoveryRequired: ["FAILED", "RECOVERING"].includes(transaction.state) || Boolean(transaction.activeOperation), resumable: !["COMPLETED", "ROLLED_BACK"].includes(transaction.state), stale, transaction }); }
  async function claim(input = {}) {
    return locked(async () => {
      const current = createInstallationTransaction(await store.read());
      if (!isStale(current)) return failure("installation.transaction.not_stale", "Installation transaction ownership is not stale.", current);
      if (!input.ownerId) return failure("installation.owner.required", "Installation transaction owner is required.", current);
      const transaction = createInstallationTransaction({ ...current, fence: current.fence + 1, ownerId: input.ownerId, revision: current.revision + 1, updatedAt: now() });
      await store.write(transaction);
      return success({ transaction });
    });
  }
  async function runOperation(input = {}) {
    return locked(async () => {
      let current = createInstallationTransaction(await store.read());
      const ownership = validateOwnership(current, input);
      if (ownership) return ownership;
      if (current.activeOperation && current.activeOperation.id !== input.operationId) return failure("installation.operation.active", "Another external Installation operation is incomplete.", current);
      const handler = mutationHandlers[input.type];
      if (typeof handler !== "function") return failure("installation.operation.handler_missing", `No handler is registered for ${input.type}.`, current);
      if (!current.activeOperation) {
        current = createInstallationTransaction({ ...current, activeOperation: { id: input.operationId, phase: "INTENT_PERSISTED", type: input.type }, revision: current.revision + 1, updatedAt: now() });
        await store.write(current);
      }
      const result = await handler({ idempotencyKey: `${current.transactionId}:${input.operationId}`, operation: current.activeOperation, transaction: current });
      const transaction = createInstallationTransaction({ ...current, activeOperation: null, checkpoints: [...current.checkpoints, { at: now(), operationId: input.operationId, revision: current.revision + 1, state: current.state }], revision: current.revision + 1, updatedAt: now() });
      await store.write(transaction);
      return success({ result, transaction });
    });
  }
  async function completeRecovery(input = {}) {
    return locked(async () => {
      const current = createInstallationTransaction(await store.read());
      const ownership = validateOwnership(current, input);
      if (ownership) return ownership;
      if (current.state === InstallationTransactionState.ROLLED_BACK) return success({ alreadyCompleted: true, transaction: current });
      if (current.state !== InstallationTransactionState.RECOVERING) return failure("installation.recovery.invalid", `Installation recovery cannot run from ${current.state}.`, current);
      await recoveryHandler({ idempotencyKey: `${current.transactionId}:recovery`, transaction: current });
      const timestamp = now();
      const transaction = createInstallationTransaction({
        ...current,
        checkpoints: [...current.checkpoints, { at: timestamp, from: current.state, revision: current.revision + 1, state: InstallationTransactionState.ROLLED_BACK }],
        revision: current.revision + 1,
        state: InstallationTransactionState.ROLLED_BACK,
        updatedAt: timestamp
      });
      await store.write(transaction);
      return success({ alreadyCompleted: false, transaction });
    });
  }
  async function locked(action) {
    await mkdir(path.dirname(lockPath), { recursive: true });
    let handle;
    try { handle = await open(lockPath, "wx"); }
    catch (error) { if (error.code === "EEXIST") return failure("installation.lock.active", "Another Installation transaction is active."); throw error; }
    try { return await action(); } finally { await handle.close(); await unlink(lockPath).catch(() => {}); }
  }
  function isStale(transaction) { const updated = Date.parse(transaction.updatedAt ?? ""); return Number.isFinite(updated) && Date.parse(now()) - updated > staleAfterMs; }
  return Object.freeze({ claim, completeRecovery, resume, runOperation, start, status, transition });
}

function nextAction(state) { return ({ PLANNING: "preflight", PREFLIGHTED: "download", DOWNLOADING: "verify", VERIFIED: "extract", EXTRACTING: "bootstrap", BOOTSTRAPPING: "configure", CONFIGURING: "install-services", SERVICE_INSTALLING: "health-check", HEALTH_CHECK: "complete", FAILED: "recover", RECOVERING: "complete-rollback" })[state] ?? null; }
function success(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message, transaction = null) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, transaction }); }
function safeFailure(error) { return Object.freeze({ code: String(error?.code ?? "installation.failed"), message: "Installation failed. Inspect redacted diagnostics." }); }
function validateOwnership(transaction, input) {
  if (input.ownerId !== transaction.ownerId || input.fence !== transaction.fence) return failure("installation.owner.fenced", "Installation transaction writer no longer owns the active fence.", transaction);
  return null;
}
