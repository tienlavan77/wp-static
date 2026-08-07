import { cp, lstat, mkdir, readFile, readlink, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createEmptySiteRegistry } from "../../site/siteRegistryContract.js";

export const PRODUCT_BOOTSTRAP_DIRECTORIES = Object.freeze(["config", "storage", "storage/logs", "storage/tmp", "storage/support-bundles", "sites", "core/releases"]);

export default function createProductCoreBootstrapService(options = {}) {
  const workspace = path.resolve(options.workspace);
  const repository = options.repository;
  const now = options.now ?? (() => new Date().toISOString());
  const renamePointer = options.renamePointer ?? rename;
  if (!repository?.readRegistry || !repository?.writeRegistry) throw new TypeError("Product/Core Bootstrap requires a Site Registry repository.");

  async function bootstrap(input = {}) {
    const verified = input.verified;
    if (!verified?.accepted || verified.manifest?.schema !== "wpsc.production-package") return failure("installation.bootstrap.package_unverified", "A verified production package is required.");
    const version = String(verified.manifest.product?.version ?? "");
    if (!/^\d+\.\d+\.\d+$/.test(version)) return failure("installation.bootstrap.version_invalid", "Verified Product version is invalid.");
    const extractedPath = path.resolve(input.extractedPath);
    const release = path.join(workspace, "core", "releases", version);
    const releaseStaging = `${release}.bootstrapping`;
    let releaseCreated = false;
    try {
      for (const directory of PRODUCT_BOOTSTRAP_DIRECTORIES) await mkdir(path.join(workspace, directory), { recursive: true });
      await assertExtractedPackage(extractedPath, verified.manifest);
      const activePointer = await readPointer(path.join(workspace, "core", "active"));
      if (activePointer && activePointer !== `releases/${version}`) return failure("installation.bootstrap.active_exists", "Existing active Core belongs to another release.");
      if (!await exists(release)) {
        await rm(releaseStaging, { force: true, recursive: true });
        await cp(extractedPath, releaseStaging, { recursive: true, verbatimSymlinks: true });
        await writeJson(path.join(releaseStaging, ".wpsc-staged.json"), { productId: "wpsc", schema: "wpsc.staged-core", schemaVersion: 1, version });
        await rename(releaseStaging, release);
        releaseCreated = true;
      }
      const configuration = await writeIfAbsent(path.join(workspace, "config", "wpsc.json"), { environment: input.environment ?? "production", product: verified.manifest.product, schema: "wpsc.product-configuration", schemaVersion: 1 });
      if (configuration.value.product?.version !== version) return failure("installation.bootstrap.configuration_mismatch", "Existing Product configuration belongs to another version.");
      const installation = await writeIfAbsent(path.join(workspace, "config", "installation.json"), { bootstrappedAt: now(), productId: "wpsc", productVersion: version, schema: "wpsc.installation-bootstrap", schemaVersion: 1 });
      const runtimeEnvironment = await writeTextIfAbsent(path.join(workspace, "config", "runtime.env"), "# WPSC Runtime environment. Operator-managed values belong here.\n");
      const runtimeConfiguration = await writeTextIfAbsent(path.join(workspace, "runtime.config.js"), createInstalledRuntimeConfig(input.runtime?.webhookBaseUrl));
      const registry = await initializeRegistry();
      if (!activePointer) await activateInitial(version);
      return success({ activeCore: `releases/${version}`, configuration: configuration.value, created: { configuration: configuration.created, installation: installation.created, registry: registry.created, release: releaseCreated, runtimeConfiguration: runtimeConfiguration.created, runtimeEnvironment: runtimeEnvironment.created }, installation: installation.value, registry: registry.value, version, workspace });
    } catch (error) { await rm(releaseStaging, { force: true, recursive: true }); return failure("installation.bootstrap.failed", error.message); }
  }

  async function activateInitial(version) {
    const active = path.join(workspace, "core", "active");
    const temporary = `${active}.${process.pid}.tmp`;
    await rm(temporary, { force: true });
    try { await symlink(`releases/${version}`, temporary); await renamePointer(temporary, active); }
    finally { await rm(temporary, { force: true }); }
  }
  async function initializeRegistry() { try { return { created: false, value: await repository.readRegistry() }; } catch (error) { if (error.code !== "ENOENT") throw error; const value = createEmptySiteRegistry(now()); await repository.writeRegistry(value); return { created: true, value }; } }
  return Object.freeze({ bootstrap });
}

async function assertExtractedPackage(directory, manifest) { const extracted = JSON.parse(await readFile(path.join(directory, "production-package.json"), "utf8")); if (extracted.integrity?.checksum !== manifest.integrity?.checksum || extracted.product?.version !== manifest.product?.version) throw new Error("Extracted production package does not match verified package."); }
async function writeIfAbsent(target, value) { try { return { created: false, value: JSON.parse(await readFile(target, "utf8")) }; } catch (error) { if (error.code !== "ENOENT") throw error; await writeJson(target, value); return { created: true, value }; } }
async function writeTextIfAbsent(target, content) { try { await readFile(target, "utf8"); return { created: false }; } catch (error) { if (error.code !== "ENOENT") throw error; await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, { encoding: "utf8", flag: "wx", mode: 0o600 }); return { created: true }; } }
async function writeJson(target, value) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.${process.pid}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
async function readPointer(target) { try { return await readlink(target); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function exists(target) { return lstat(target).then(() => true, () => false); }
function success(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }

function createInstalledRuntimeConfig(webhookBaseUrl = "http://127.0.0.1/webhook") {
  return `import createSourceAdapterLoader from "./core/active/framework/src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "./core/active/framework/src/source/createSourceRegistry.js";
import createWordPressSourceAdapter from "./core/active/framework/src/source/createWordPressSourceAdapter.js";

const demoAdapter = {
  async initialize() { return { ok: true }; },
  async validate() { return { ok: true }; },
  async healthCheck() { return { ok: true }; },
  async getMetadata() { return { adapterVersion: "1.0", capabilities: ["supportsWebhook"], sourceType: "demo" }; },
  async registerWebhook() { return { ok: true, webhookId: "demo-webhook-1" }; },
  async verifyWebhook() { return { ok: true }; },
  async unregisterWebhook() { return { ok: true }; }
};

export default {
  adapterLoader: createSourceAdapterLoader({ registry: createSourceRegistry({ adapters: [
    { type: "demo", create: () => demoAdapter },
    { type: "wordpress", create: (options) => createWordPressSourceAdapter({ ...options, webhookSecret: options.webhookSecret }) },
    { type: "wordpress-woocommerce", create: (options) => createWordPressSourceAdapter({ ...options, sourceType: "wordpress-woocommerce" }) }
  ] }) }),
  webhookBaseUrl: ${JSON.stringify(String(webhookBaseUrl))}
};
`;
}
