import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";
import createProductManifest from "./createProductManifest.js";
import { createEmptySiteRegistry } from "../site/siteRegistryContract.js";

export const INSTALLATION_BOOTSTRAP_SCHEMA = "wpsc.installation-bootstrap";
export const INSTALLATION_BOOTSTRAP_VERSION = 1;
export const INSTALLATION_DIRECTORIES = Object.freeze(["config", "storage", "storage/logs", "storage/tmp", "storage/support-bundles", "sites"]);

export default function createInstallationBootstrapService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const repository = options.repository;
  if (!repository?.readRegistry || !repository?.writeRegistry) throw new TypeError("Installation Bootstrap requires a Site Repository.");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const validateRuntime = options.validateRuntime ?? (async () => ({ ok: true, readiness: "ready" }));

  async function bootstrap(input = {}) {
    try {
      for (const directory of INSTALLATION_DIRECTORIES) await mkdir(path.join(workspaceDir, directory), { recursive: true });
      const product = createProductManifest({ version: input.version ?? "1.0.0" });
      const configuration = await writeIfAbsent(configurationPath(), { environment: input.environment ?? "production", product, schema: INSTALLATION_BOOTSTRAP_SCHEMA, schemaVersion: INSTALLATION_BOOTSTRAP_VERSION });
      const installation = await writeIfAbsent(installationPath(), { bootstrappedAt: now(), productId: product.productId, schema: INSTALLATION_BOOTSTRAP_SCHEMA, schemaVersion: INSTALLATION_BOOTSTRAP_VERSION });
      const registry = await initializeRegistry();
      const readiness = await validateRuntime({ configuration: configuration.value, product, workspaceDir });
      if (!readiness?.ok) return failure("installation.bootstrap.runtime.not_ready", "Runtime readiness validation failed.", { configuration, installation, readiness, registry });
      return success({ configuration: configuration.value, created: { configuration: configuration.created, installation: installation.created, registry: registry.created }, installation: installation.value, readiness, registry: registry.value, workspaceDir });
    } catch (error) { return failure("installation.bootstrap.failed", error.message); }
  }

  async function initializeRegistry() {
    try { return { created: false, value: await repository.readRegistry() }; }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      const value = createEmptySiteRegistry(now());
      await repository.writeRegistry(value);
      return { created: true, value };
    }
  }

  function configurationPath() { return path.join(workspaceDir, "config", "wpsc.json"); }
  function installationPath() { return path.join(workspaceDir, "config", "installation.json"); }
  async function writeIfAbsent(target, value) {
    try { return { created: false, value: JSON.parse(await readFile(target, "utf8")) }; }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.tmp`;
      await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      await rename(temporary, target);
      return { created: true, value };
    }
  }
  return Object.freeze({ bootstrap });
}

function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, schema: INSTALLATION_BOOTSTRAP_SCHEMA, schemaVersion: INSTALLATION_BOOTSTRAP_VERSION, ...data }); }
function failure(code, message, data = {}) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, schema: INSTALLATION_BOOTSTRAP_SCHEMA, schemaVersion: INSTALLATION_BOOTSTRAP_VERSION, ...data }); }
