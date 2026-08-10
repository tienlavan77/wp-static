import path from "node:path";
import { validateReleaseOperationsConfiguration } from "./createReleaseOperationsConfiguration.js";

export default function createReadOnlyReleaseOperationsFacade(options = {}) {
  const installationId = String(options.installationId ?? "");
  const registry = options.registry;
  const releaseUpdate = options.releaseUpdate;
  const verifier = options.verifier;
  const configuration = validateReleaseOperationsConfiguration(options.configuration ?? {}, { retiredHarness: options.retiredHarness });
  if (!registry?.read) throw new TypeError("Read-only release operations Registry dependency is incomplete.");

  async function verifyRelease(input = {}) {
    if (!verifier?.verifyPackage) throw new TypeError("C041 verifier is unavailable.");
    const result = await verifier.verifyPackage({ packageDir: path.resolve(String(input.artifact ?? "")), publicKey: input.publicKey });
    return { ...result, mode: "VERIFY", mutation: "NONE" };
  }

  async function rollout(input = {}) {
    if (!releaseUpdate?.check) throw new TypeError("C049 read-only check is unavailable.");
    const id = requireInstallation(input.installationId ?? installationId);
    const registryValue = await registry.read();
    const installation = registryValue.installations?.[id];
    if (!installation) return failure("installation.not_found", "Installation is not registered.");
    const channel = configuration.channels[String(input.channel ?? "")];
    if (!channel) return failure("release_operations.channel.not_found", "Release channel is not configured.");
    const result = await releaseUpdate.check({ installationId: id, channel: input.channel });
    return { ...result, channel: input.channel, installationId: id, workspace: installation.workspace, dryRun: input.dryRun === true, mutation: "NONE" };
  }

  async function verifyInstallation(input = {}) {
    const id = requireInstallation(input.installationId ?? installationId);
    const registryValue = await registry.read();
    const installation = registryValue.installations?.[id];
    if (!installation) return failure("installation.not_found", "Installation is not registered.");
    const health = options.health?.read ? await optionalRead(options.health) : null;
    const evidence = options.evidence?.read ? await optionalRead(options.evidence) : null;
    return { ok: health?.state === "HEALTHY" || !options.health, installationId: id, workspace: installation.workspace, health: health ? { state: health.state, reportPath: options.health.reportPath } : null, evidence: evidence ? { schema: evidence.schema, status: evidence.status, transactionId: evidence.transactionId } : null, mutation: "NONE" };
  }
  return Object.freeze({ rollout, verifyInstallation, verifyRelease, configuration });
}

function requireInstallation(value) { if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(String(value ?? ""))) throw new TypeError("--installation requires a valid Installation ID."); return String(value); }
function failure(code, message) { return { code, message, ok: false }; }
async function optionalRead(owner) { try { return await owner.read(); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
