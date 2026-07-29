import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import createSiteRuntimeConfigTemplate from "../runtime/createSiteRuntimeConfigTemplate.js";

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

  async function ensureRuntimeConfig(domain) {
    const configPath = path.join(workspaceDir, "runtime.config.js");
    try {
      await access(configPath);
      return { created: false, path: configPath };
    } catch {
      await writeFile(configPath, createSiteRuntimeConfigTemplate({ webhookBaseUrl: domain ? `http://${domain}/webhook` : undefined }), "utf8");
      return { created: true, path: configPath };
    }
  }

  return Object.freeze({
    async run(input = {}) {
      const result = await provisioningService.createSite({ name: input.siteId || input.name, uuid: input.uuid });
      if (!result.ok) return result;
      const domain = normalizeDomain(input.domain);
      let domainRegistryPath = null;
      if (domain) domainRegistryPath = await registerDomain(domain, result.siteId);
      const runtimeConfig = await ensureRuntimeConfig(domain);
      write(`Site skeleton created: ${result.paths.root}`);
      if (domain) write(`Domain mapped: ${domain} -> ${result.siteId}`);
      if (runtimeConfig.created) write(`Runtime config created: ${runtimeConfig.path}`);
      return { ...result, domain, domainRegistryPath, runtimeConfigPath: runtimeConfig.path };
    },
    version: SITE_CREATE_COMMAND_VERSION
  });
}
