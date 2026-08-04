import path from "node:path";

export default async function resolveInstallationWorkspace(input = {}) {
  if (input.project) return result(path.resolve(input.project), "project");
  if (input.installation) return resolveRegistered(input.registry, input.installation, "installation");
  if (input.environmentRoot) return result(path.resolve(input.environmentRoot), "environment");
  if (!input.registry) return failure("installation.selection.required", "Installation selection is required because no registry is available.");
  const registry = await input.registry.read();
  if (!registry.defaultInstallation) return failure("installation.selection.required", "Installation selection is required because no default Installation is configured.");
  return resolveRegistered(input.registry, registry.defaultInstallation, "default");
}

async function resolveRegistered(registryService, id, source) {
  if (!registryService) return failure("installation.registry.required", "Installation registry is required.");
  const registry = await registryService.read();
  const installation = registry.installations[id];
  if (!installation) return failure("installation.not_found", `Installation ${id} is not registered.`);
  return { installationId: id, ok: true, source, workspace: installation.workspace };
}
function result(workspace, source) { return { installationId: null, ok: true, source, workspace }; }
function failure(code, message) { return { diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }; }
