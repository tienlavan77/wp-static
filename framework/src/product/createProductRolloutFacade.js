export default function createProductRolloutFacade(options = {}) {
  const registry = options.registry;
  const releaseUpdate = options.releaseUpdate;
  const configuration = options.configuration;
  if (!registry?.read || !releaseUpdate?.check || !releaseUpdate?.update || !releaseUpdate?.status) throw new TypeError("Product rollout dependencies are incomplete.");

  async function rollout(input = {}) {
    const installationId = requireInstallation(input.installationId);
    const channelName = String(input.channel ?? "");
    const channel = configuration?.channels?.[channelName];
    if (!channel) return failure("release_operations.channel.not_found", "Release channel is not configured.");
    const registered = await registry.read();
    const installation = registered.installations?.[installationId];
    if (!installation) return failure("installation.not_found", "Installation is not registered.");
    const availability = await releaseUpdate.check({ channel: channelName, installationId });
    if (availability?.ok === false) return availability;
    if (input.dryRun === true) return success({ availability, channel: channelName, dryRun: true, installationId, mutation: "NONE", workspace: installation.workspace });
    if (input.confirmed !== true) return failure("CONFIRMATION_REQUIRED", "Rollout requires --confirm.", { availability, installationId, mutation: "NONE" });
    const updated = await releaseUpdate.update({ channel: channelName, installationId });
    if (updated?.ok === false) return updated;
    const status = await releaseUpdate.status({ installationId });
    if (status?.ok === false) return status;
    return success({ channel: channelName, evidence: reference(updated.evidence), installationId, mutation: "C049", status, transactionId: updated.transactionId ?? status.transaction?.transactionId ?? null, update: concise(updated) });
  }
  return Object.freeze({ rollout });
}

function requireInstallation(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("--installation requires a valid Installation ID."); return id; }
function concise(value = {}) { return { finalVersion: value.finalVersion ?? null, status: value.status ?? null }; }
function reference(value) { return value ? { schema: value.schema ?? null, status: value.status ?? null, transactionId: value.transactionId ?? null } : null; }
function success(value) { return { diagnostics: { errors: [], warnings: [] }, ok: true, ...value }; }
function failure(code, message, extra = {}) { return { code, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...extra }; }
