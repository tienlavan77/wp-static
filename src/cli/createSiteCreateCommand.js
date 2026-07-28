import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const SITE_CREATE_COMMAND_VERSION = "1.0";

function normalizeDomain(domain) { return String(domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""); }

export default function createSiteCreateCommand(options = {}) {
  const provisioningService = options.provisioningService;
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  const write = options.write || (() => {});
  if (!provisioningService || typeof provisioningService.createSite !== "function") throw new TypeError("Site create command requires a Provisioning Service.");

  async function registerDomain(domain, siteId) {
    const registryPath = path.join(workspaceDir, "config", "runtime-sites.json");
    let registry = { domains: {}, schema: "wpsc-runtime-sites", schemaVersion: 1 };
    try { registry = JSON.parse(await readFile(registryPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const next = { ...registry, domains: { ...(registry.domains || {}), [domain]: siteId } };
    await mkdir(path.dirname(registryPath), { recursive: true });
    const temporaryPath = `${registryPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(temporaryPath, registryPath);
    return registryPath;
  }

  return Object.freeze({
    async run(input = {}) {
      const result = await provisioningService.createSite({ name: input.siteId || input.name, uuid: input.uuid });
      if (!result.ok) return result;
      const domain = normalizeDomain(input.domain);
      let domainRegistryPath = null;
      if (domain) domainRegistryPath = await registerDomain(domain, result.siteId);
      write(`Site skeleton created: ${result.paths.root}`);
      if (domain) write(`Domain mapped: ${domain} -> ${result.siteId}`);
      return { ...result, domain, domainRegistryPath };
    },
    version: SITE_CREATE_COMMAND_VERSION
  });
}
