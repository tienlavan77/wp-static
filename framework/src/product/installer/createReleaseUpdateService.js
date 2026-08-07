import path from "node:path";
import createInstallationTransactionService from "./createInstallationTransactionService.js";

const UPDATE_PLAN = Object.freeze({ kind: "release-update", phases: ["check", "acquire", "verify", "stage", "activate", "runtime", "health"] });

export default function createReleaseUpdateService(options = {}) {
  const workspace = path.resolve(options.workspace ?? process.cwd());
  const installationId = String(options.installationId ?? "");
  const metadata = options.metadata;
  const transactionFactory = options.transactionFactory ?? createInstallationTransactionService;
  const acquisition = options.acquisition;
  const verifier = options.verifier;
  const staging = options.staging;
  const activation = options.activation;
  const runtime = options.runtime;
  const health = options.health;
  const evidenceStore = options.evidenceStore;
  const snapshot = options.snapshot ?? (async () => ({}));
  const recovery = options.recovery;
  if (!installationId || !metadata?.check || !acquisition?.acquire || !verifier?.verifyPackage || !staging?.stage || !activation?.activate || !runtime?.restart || !health?.inspect) throw new TypeError("Release Update Service dependencies are incomplete.");

  async function check() { return metadata.check({ installationId, productId: options.productId ?? "wpsc" }); }

  async function update(input = {}) {
    const availability = await check();
    if (!availability.ok) return availability;
    if (!availability.available) return success({ alreadyCurrent: true, currentVersion: availability.currentVersion, installationId, status: "UP_TO_DATE" });
    const release = input.releaseVersion ? availability.releases.find((candidate) => candidate.version === input.releaseVersion) : availability.available;
    if (!release) return failure("release_update.target.invalid", "Requested release is not available or compatible.");
    if (release.version === availability.currentVersion) return success({ alreadyCurrent: true, currentVersion: release.version, installationId, status: "UP_TO_DATE" });
    const ownerId = input.ownerId ?? `release-update-${process.pid}`;
    let acquired = null;
    const transaction = transactionFactory({
      mutationHandlers: {
        "acquire-release": async ({ idempotencyKey }) => { acquired = await acquisition.acquire({ ...release, installationId, idempotencyKey, targetDir: input.packageDir }); return acquired; },
        "activate-release": async () => activation.activate(release.version),
        "health-check": async () => health.inspect({ installationId, workspace, expectedVersion: release.version }),
        "restart-runtime": async () => runtime.restart({ installationId, workspace, version: release.version }),
        "stage-release": async () => staging.stage({ packageDir: acquired?.packageDir, packageId: release.productId, version: release.version }),
        "verify-release": async () => verifier.verifyPackage({ packageDir: acquired?.packageDir, publicKey: input.publicKey })
      },
      workspace
    });
    const started = await transaction.start({ installationId, ownerId, plan: { ...UPDATE_PLAN, currentVersion: availability.currentVersion, targetVersion: release.version } });
    if (!started.ok) return started;
    const tx = started.transaction;
    const ownership = { fence: tx.fence, ownerId };
    let activated = false;
    const before = await snapshot({ phase: "before-update", workspace });
    try {
      await transition(transaction, ownership, "PREFLIGHTED");
      await transition(transaction, ownership, "DOWNLOADING");
      acquired = await operation(transaction, ownership, "update-package-download", "acquire-release");
      const verified = await operation(transaction, ownership, "update-package-verify", "verify-release");
      if (!verified.accepted) throw coded("release_update.verification.failed", "Release failed C041 verification.");
      await transition(transaction, ownership, "VERIFIED");
      await transition(transaction, ownership, "EXTRACTING");
      await operation(transaction, ownership, "update-stage", "stage-release");
      await transition(transaction, ownership, "BOOTSTRAPPING");
      const activationResult = await operation(transaction, ownership, "update-activation", "activate-release");
      activated = activationResult?.ok === true;
      await transition(transaction, ownership, "CONFIGURING");
      await operation(transaction, ownership, "update-runtime", "restart-runtime");
      await transition(transaction, ownership, "SERVICE_INSTALLING");
      await transition(transaction, ownership, "HEALTH_CHECK");
      const healthResult = await operation(transaction, ownership, "update-health", "health-check");
      if (healthResult.state !== "HEALTHY") throw coded("release_update.health.failed", "Updated Installation did not become healthy.");
      await transition(transaction, ownership, "COMPLETED");
      const after = await snapshot({ phase: "after-update", workspace });
      assertProtected(before, after);
      const evidence = await persistEvidence({ acquisition: acquired, activation: { activeVersion: release.version, ok: true }, after, before, currentVersion: availability.currentVersion, health: healthResult, installationId, release, status: "PASS", targetVersion: release.version, transactionId: tx.transactionId, workspace });
      return success({ evidence, finalVersion: release.version, installationId, status: "PASS", transactionId: tx.transactionId });
    } catch (error) {
      const current = (await transaction.status()).transaction;
      if (!["FAILED", "COMPLETED", "ROLLED_BACK"].includes(current.state)) await transaction.transition({ error: { code: error.code ?? "release_update.failed" }, fence: current.fence, ownerId, state: "FAILED" });
      if (activated && recovery?.restore) await recovery.restore({ installationId, workspace, transactionId: tx.transactionId });
      return failure(error.code ?? "release_update.failed", "Release update failed; Installation remains recoverable.", { transactionId: tx.transactionId });
    }
  }

  async function persistEvidence(value) { return evidenceStore?.write ? evidenceStore.write(value) : value; }

  return Object.freeze({ check, update });
  async function operation(service, owner, operationId, type) { const result = await service.runOperation({ ...owner, operationId, type }); const output = result.result ?? result; if (!result.ok || output?.ok === false) throw coded(output?.diagnostics?.errors?.[0]?.code ?? result.diagnostics?.errors?.[0]?.code ?? "release_update.operation.failed", output?.diagnostics?.errors?.[0]?.message ?? result.diagnostics?.errors?.[0]?.message ?? "Release operation failed."); return output; }
}

async function transition(transaction, ownership, state) { const result = await transaction.transition({ ...ownership, state }); if (!result.ok) throw coded(result.diagnostics?.errors?.[0]?.code ?? "release_update.transition.failed", "Release update transition failed."); return result; }
function assertProtected(before, after) { for (const key of ["credentials", "database", "publicOutput", "siteConfiguration"]) if (before?.[key] !== undefined && before[key] !== after?.[key]) throw coded("release_update.protected_state_changed", `Protected state changed: ${key}.`); }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
function success(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message, data = {}) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
