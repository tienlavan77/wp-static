import { readFile } from "node:fs/promises";
import path from "node:path";
import importProjectModule from "../shared/importProjectModule.js";

export const SITE_RUNTIME_CONFIG_FILE = "runtime.config.js";

function diagnostic(code, message) { return { code, message, severity: "error" }; }

async function readDomainRegistry(workspaceDir) {
  try {
    return JSON.parse(await readFile(path.join(workspaceDir, "config", "runtime-sites.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { domains: {} };
    throw error;
  }
}

export default async function loadSiteRuntimeConfig(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  const configPath = path.resolve(workspaceDir, options.configPath || SITE_RUNTIME_CONFIG_FILE);
  try {
    const loaded = await importProjectModule(configPath);
    const config = loaded.default || loaded.runtime || loaded;
    const domains = { ...(await readDomainRegistry(workspaceDir)).domains, ...(config.domains || {}) };
    const errors = [];
    if (!config || typeof config !== "object") errors.push(diagnostic("runtime.site_config.invalid", "Site Runtime configuration must export an object."));
    if (!config?.adapterLoader || typeof config.adapterLoader.load !== "function") errors.push(diagnostic("runtime.site_config.adapter_loader.required", "Site Runtime configuration requires adapterLoader.load()."));
    if (!config?.contentReader || typeof config.contentReader.read !== "function") errors.push(diagnostic("runtime.site_config.content_reader.required", "Site Runtime configuration requires contentReader.read()."));
    if (!config?.themeRenderer || typeof config.themeRenderer.render !== "function") errors.push(diagnostic("runtime.site_config.theme_renderer.required", "Site Runtime configuration requires themeRenderer.render()."));
    if (typeof config?.webhookBaseUrl !== "string" || !config.webhookBaseUrl.trim()) errors.push(diagnostic("runtime.site_config.webhook_base_url.required", "Site Runtime configuration requires webhookBaseUrl."));
    if (Object.values(domains).some((siteId) => typeof siteId !== "string" || !siteId.trim())) errors.push(diagnostic("runtime.site_config.domains.invalid", "Runtime domain mappings must contain Site ids."));
    return errors.length ? { diagnostics: { errors, warnings: [] }, ok: false } : { config: { ...config, domains }, configPath, diagnostics: { errors: [], warnings: [] }, ok: true, workspaceDir };
  } catch (error) {
    return { diagnostics: { errors: [diagnostic("runtime.site_config.load.failed", error.message)], warnings: [] }, ok: false };
  }
}
