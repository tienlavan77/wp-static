import createInstallationTransactionService from "./createInstallationTransactionService.js";

export default function createProductInstallerOrchestrator(options = {}) {
  const components = options.components ?? {};
  const now = options.now;
  validateComponents(components);

  async function install(input = {}) {
    const transaction = transactionService(input);
    const started = await transaction.start({ installationId: input.installationId, ownerId: input.ownerId, plan: installationPlan(input), transactionId: input.transactionId });
    if (!started.ok) return started;
    return advance(input, transaction);
  }

  async function resume(input = {}) {
    const transaction = transactionService(input);
    const status = await transaction.status();
    if (["COMPLETED", "ROLLED_BACK", "FAILED", "RECOVERING"].includes(status.transaction.state)) {
      return Object.freeze({ installationId: input.installationId, ok: status.transaction.state === "COMPLETED", state: status.transaction.state, transaction: status.transaction });
    }
    return advance(input, transaction);
  }

  async function advance(input, transaction) {
    try {
      while (true) {
        const current = (await transaction.status()).transaction;
        const ownership = { fence: current.fence, ownerId: input.ownerId };
        if (current.state === "PLANNING") {
          await requireOk(await components.preflight(input), "Installer preflight failed.");
          await transition(transaction, ownership, "PREFLIGHTED");
        } else if (current.state === "PREFLIGHTED") await transition(transaction, ownership, "DOWNLOADING");
        else if (current.state === "DOWNLOADING") {
          await operationIfPending(transaction, ownership, "node", "install-node");
          await operationIfPending(transaction, ownership, "package-download", "acquire-package");
          await verify(input);
          await transition(transaction, ownership, "VERIFIED");
        } else if (current.state === "VERIFIED") await transition(transaction, ownership, "EXTRACTING");
        else if (current.state === "EXTRACTING") {
          await operationIfPending(transaction, ownership, "package", "extract-package");
          await transition(transaction, ownership, "BOOTSTRAPPING");
        } else if (current.state === "BOOTSTRAPPING") {
          await operationIfPending(transaction, ownership, "core", "bootstrap-core");
          await transition(transaction, ownership, "CONFIGURING");
        } else if (current.state === "CONFIGURING") {
          await operationIfPending(transaction, ownership, "global-command", "install-global-command");
          await transition(transaction, ownership, "SERVICE_INSTALLING");
        } else if (current.state === "SERVICE_INSTALLING") {
          await operationIfPending(transaction, ownership, "systemd", "install-systemd");
          await operationIfPending(transaction, ownership, "nginx", "activate-nginx");
          await transition(transaction, ownership, "HEALTH_CHECK");
        } else if (current.state === "HEALTH_CHECK") {
          await operationIfPending(transaction, ownership, "health", "installation-health");
          await transition(transaction, ownership, "COMPLETED");
        } else if (current.state === "COMPLETED") return Object.freeze({ installationId: input.installationId, ok: true, state: "COMPLETED", transaction: current });
        else return Object.freeze({ installationId: input.installationId, ok: false, state: current.state, transaction: current });
      }
    } catch (error) {
      const current = (await transaction.status()).transaction;
      if (!["FAILED", "COMPLETED", "ROLLED_BACK"].includes(current.state)) await transaction.transition({ error: { code: error.code ?? "installation.orchestrator.failed" }, fence: current.fence, ownerId: input.ownerId, state: "FAILED" });
      const failed = (await transaction.status()).transaction;
      return Object.freeze({ diagnostics: { errors: [{ code: error.code ?? "installation.orchestrator.failed", message: "Installation failed. Inspect persisted health and transaction evidence.", severity: "error" }], warnings: [] }, installationId: input.installationId, ok: false, state: failed.state, transaction: failed });
    }
  }

  function transactionService(input) {
    return createInstallationTransactionService({
      mutationHandlers: {
        "acquire-package": async ({ idempotencyKey }) => requireOk(await components.acquisition.acquire({ ...input.acquisition, idempotencyKey }), "Production package acquisition failed."),
        "activate-nginx": async () => requireOk(await components.nginx.install(input.nginx), "Nginx installation failed."),
        "bootstrap-core": async () => {
          const verified = await verify(input);
          return requireOk(await components.bootstrap.bootstrap({ ...input.bootstrap, extractedPath: extractionTarget(input), verified }), "Product/Core bootstrap failed.");
        },
        "extract-package": async () => {
          const verified = await verify(input);
          return requireOk(await components.package.extract({ ...packageInput(input), targetDir: extractionTarget(input), verified }), "Production package extraction failed.");
        },
        "install-global-command": async () => requireOk(await components.globalCommand.install(input.globalCommand), "Global command installation failed."),
        "install-node": async () => requireOk(await components.node.install(input.node), "Node installation failed."),
        "install-systemd": async () => requireOk(await components.systemd.install(input.systemd), "systemd installation failed."),
        "installation-health": async () => { const health = await components.health.inspect(input.health); if (health.state !== "HEALTHY") throw coded("installation.health.failed", `Installation health is ${health.state}.`); return health; }
      },
      now,
      staleAfterMs: options.staleAfterMs,
      workspace: input.workspace
    });
  }
  async function verify(input) { return requireVerified(await components.package.verifyPackage(packageInput(input)), "Production package verification failed."); }
  return Object.freeze({ install, resume });
}

async function operationIfPending(transaction, ownership, operationId, type) {
  const current = (await transaction.status()).transaction;
  if (current.checkpoints.some((checkpoint) => checkpoint.operationId === operationId)) return current;
  if (current.activeOperation && current.activeOperation.id !== operationId) throw coded("installation.operation.order_invalid", `Incomplete operation ${current.activeOperation.id} must resume before ${operationId}.`);
  const result = await transaction.runOperation({ ...ownership, operationId, type });
  if (!result.ok) throw coded(result.diagnostics.errors[0].code, result.diagnostics.errors[0].message);
  return result;
}
async function transition(transaction, ownership, state) { const result = await transaction.transition({ ...ownership, state }); if (!result.ok) throw coded(result.diagnostics.errors[0].code, result.diagnostics.errors[0].message); return result; }
async function requireOk(value, message) { if (!value?.ok) throw coded(value?.diagnostics?.errors?.[0]?.code ?? "installation.component.failed", message); return value; }
async function requireVerified(value, message) { if (!value?.accepted) throw coded(value?.diagnostics?.errors?.[0]?.code ?? "installation.package.unverified", message); return value; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
function installationPlan(input) { return Object.freeze({ installationId: input.installationId, phases: ["preflight", "node", "verify", "extract", "bootstrap", "global-command", "systemd", "nginx", "health"], schema: "wpsc.product-installation-plan", schemaVersion: 1, workspace: input.workspace }); }
function extractionTarget(input) { return input.package?.targetDir ?? input.bootstrap?.extractedPath; }
function packageInput(input) { return Object.freeze({ ...input.package, packageDir: input.acquisition?.targetDir }); }
function validateComponents(components) {
  const required = [["preflight"], ["node", "install"], ["acquisition", "acquire"], ["package", "verifyPackage"], ["package", "extract"], ["bootstrap", "bootstrap"], ["globalCommand", "install"], ["systemd", "install"], ["nginx", "install"], ["health", "inspect"]];
  for (const [component, method] of required) {
    const value = method ? components[component]?.[method] : components[component];
    if (typeof value !== "function") throw new TypeError(`Installer Orchestrator requires ${component}${method ? `.${method}` : ""}.`);
  }
}
