import deepFreeze from "../../shared/deepFreeze.js";

export const INSTALLATION_SCHEMA = "wpsc.installation";
export const INSTALLATION_SCHEMA_VERSION = 1;
export const INSTALLATION_TRANSACTION_SCHEMA = "wpsc.installation-transaction";
export const INSTALLATION_TRANSACTION_SCHEMA_VERSION = 1;

export const InstallationOperationMode = Object.freeze({
  REINSTALL: "REINSTALL",
  REPAIR: "REPAIR",
  UPGRADE: "UPGRADE",
  VERIFY: "VERIFY"
});

export const INSTALLER_OWNED_REPAIR_ARTIFACTS = Object.freeze([
  "global-command",
  "systemd-unit",
  "nginx-managed-config",
  "mutable-directories",
  "installation-state"
]);

export const REPAIR_PROTECTED_RESOURCES = Object.freeze([
  "core-version",
  "site-state",
  "credentials",
  "public-output",
  "database"
]);

export const NginxInstallationOwnership = Object.freeze({
  activation: "atomic-after-validation",
  managedConfig: "wpsc",
  operatorConfig: "operator",
  validationCommand: "nginx -t"
});

export const CertifiedNodePolicy = Object.freeze({
  channel: "latest-certified",
  newerMajorRequiresCompatibilityTrack: true,
  selection: "newest-stable-within-tested-majors"
});

export const InstallationTransactionState = Object.freeze({
  BOOTSTRAPPING: "BOOTSTRAPPING",
  COMPLETED: "COMPLETED",
  CONFIGURING: "CONFIGURING",
  DOWNLOADING: "DOWNLOADING",
  EXTRACTING: "EXTRACTING",
  FAILED: "FAILED",
  HEALTH_CHECK: "HEALTH_CHECK",
  PLANNING: "PLANNING",
  PREFLIGHTED: "PREFLIGHTED",
  RECOVERING: "RECOVERING",
  ROLLED_BACK: "ROLLED_BACK",
  SERVICE_INSTALLING: "SERVICE_INSTALLING",
  VERIFIED: "VERIFIED"
});

export const InstallationStatus = Object.freeze({
  FAILED: "FAILED",
  INSTALLING: "INSTALLING",
  READY: "READY",
  ROLLED_BACK: "ROLLED_BACK"
});

export const PrivilegedInstallationOperation = Object.freeze({
  ACTIVATE_NGINX: "activate-nginx",
  INSTALL_GLOBAL_COMMAND: "install-global-command",
  INSTALL_NODE: "install-node",
  INSTALL_SYSTEMD: "install-systemd",
  PREPARE_DIRECTORIES: "prepare-directories",
  RELOAD_NGINX: "reload-nginx",
  RESTART_RUNTIME: "restart-runtime",
  SET_OWNERSHIP: "set-ownership"
});

const forward = [
  ["PLANNING", "PREFLIGHTED"],
  ["PREFLIGHTED", "DOWNLOADING"],
  ["DOWNLOADING", "VERIFIED"],
  ["VERIFIED", "EXTRACTING"],
  ["EXTRACTING", "BOOTSTRAPPING"],
  ["BOOTSTRAPPING", "CONFIGURING"],
  ["CONFIGURING", "SERVICE_INSTALLING"],
  ["SERVICE_INSTALLING", "HEALTH_CHECK"],
  ["HEALTH_CHECK", "COMPLETED"],
  ["FAILED", "RECOVERING"],
  ["RECOVERING", "ROLLED_BACK"]
];

export function canTransitionInstallation(from, to) {
  if (to === InstallationTransactionState.FAILED) return ![InstallationTransactionState.COMPLETED, InstallationTransactionState.ROLLED_BACK].includes(from);
  return forward.some(([source, target]) => source === from && target === to);
}

export function createInstallationTransaction(input = {}) {
  const state = input.state ?? InstallationTransactionState.PLANNING;
  if (!Object.values(InstallationTransactionState).includes(state)) throw new TypeError(`Unknown Installation transaction state: ${state}.`);
  return deepFreeze({
    activeOperation: input.activeOperation ?? null,
    checkpoints: Array.isArray(input.checkpoints) ? input.checkpoints : [],
    installationId: requiredId(input.installationId),
    lastError: input.lastError ?? null,
    fence: Number.isInteger(input.fence) && input.fence > 0 ? input.fence : 1,
    ownerId: String(input.ownerId ?? ""),
    plan: input.plan ?? null,
    recovery: input.recovery ?? null,
    revision: validRevision(input.revision),
    schema: INSTALLATION_TRANSACTION_SCHEMA,
    schemaVersion: INSTALLATION_TRANSACTION_SCHEMA_VERSION,
    state,
    transactionId: String(input.transactionId ?? ""),
    updatedAt: input.updatedAt ?? null
  });
}

export function createInstallationState(input = {}) {
  const status = input.state ?? InstallationStatus.INSTALLING;
  if (!Object.values(InstallationStatus).includes(status)) throw new TypeError(`Unknown Installation state: ${status}.`);
  return deepFreeze({
    activeCore: input.activeCore ?? null,
    coreVersion: input.coreVersion ?? null,
    installationId: requiredId(input.installationId),
    nodeVersion: input.nodeVersion ?? null,
    productVersion: input.productVersion ?? null,
    revision: validRevision(input.revision),
    runtimeUser: input.runtimeUser ?? "www-data",
    schema: INSTALLATION_SCHEMA,
    schemaVersion: INSTALLATION_SCHEMA_VERSION,
    state: status,
    updatedAt: input.updatedAt ?? null,
    workspace: String(input.workspace ?? "")
  });
}

export function createInstallationPlan(input = {}) {
  const mode = input.mode ?? InstallationOperationMode.VERIFY;
  if (!Object.values(InstallationOperationMode).includes(mode)) throw new TypeError(`Unknown Installation operation mode: ${mode}.`);
  const operations = (input.operations ?? []).map((operation) => {
    if (!Object.values(PrivilegedInstallationOperation).includes(operation.type)) throw new TypeError(`Privileged Installation operation is not allowed: ${operation.type}.`);
    if (mode === InstallationOperationMode.REPAIR && !["activate-nginx", "install-global-command", "install-systemd", "prepare-directories"].includes(operation.type)) throw new TypeError(`Repair operation is not allowed: ${operation.type}.`);
    return deepFreeze({ arguments: deepFreeze({ ...(operation.arguments ?? {}) }), type: operation.type });
  });
  return deepFreeze({ dryRun: input.dryRun === true, installationId: requiredId(input.installationId), mode, operations, schema: "wpsc.installation-plan", schemaVersion: 1, workspace: String(input.workspace ?? "") });
}

export function createInstallationRecoveryScope(input = {}) {
  const resources = [...new Set(input.resources ?? [])];
  for (const resource of resources) if (!INSTALLER_OWNED_REPAIR_ARTIFACTS.includes(resource)) throw new TypeError(`Installer recovery does not own resource: ${resource}.`);
  return deepFreeze({ owner: "installer", resources });
}

function requiredId(value) {
  const id = String(value ?? "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Installation id is invalid.");
  return id;
}

function validRevision(value) { return Number.isInteger(value) && value >= 0 ? value : 0; }
