import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import createSiteRepository from "../../site/createSiteRepository.js";
import createProductionPackageVerifier from "../package/createProductionPackageVerifier.js";
import createGlobalWpscCommandService from "./createGlobalWpscCommandService.js";
import createInstallationHealthService, { createDefaultInstallationHealthChecks } from "./createInstallationHealthService.js";
import createInstallationMaintenanceService from "./createInstallationMaintenanceService.js";
import createInstallationRegistryService from "./createInstallationRegistryService.js";
import createInstallationStateService from "./createInstallationStateService.js";
import createNginxInstaller from "./createNginxInstaller.js";
import createNodeDistributionService from "./createNodeDistributionService.js";
import createProductCoreBootstrapService from "./createProductCoreBootstrapService.js";
import createProductInstallerOrchestrator from "./createProductInstallerOrchestrator.js";
import createProductionPackageAcquisitionService from "./createProductionPackageAcquisitionService.js";
import createRealVpsAcceptanceProbes from "./createRealVpsAcceptanceProbes.js";
import createSystemdRuntimeInstaller from "./createSystemdRuntimeInstaller.js";

const execFileDefault = promisify(execFileCallback);

export default async function createC048VpsRuntime(options = {}) {
  const workspace = path.resolve(options.workspace);
  const installationId = required(options.installationId, "Installation ID");
  const domain = required(options.domain, "domain");
  const runtime = { group: "www-data", host: "127.0.0.1", port: 8787, user: "www-data", ...(options.runtime ?? {}) };
  const packageConfig = validatePackage(options.package, workspace, installationId);
  const nodeConfig = validateNode(options.node, workspace, installationId);
  const execFile = options.execFile ?? execFileDefault;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const registry = createInstallationRegistryService({ path: options.registryPath ?? "/etc/wpsc/installations.json" });
  const installationState = createInstallationStateService({ workspace });
  const siteRepository = createSiteRepository({ workspaceDir: workspace });
  const publicKey = await readFile(packageConfig.publicKeyPath, "utf8");
  const acquisition = createProductionPackageAcquisitionService({ allowedHosts: [new URL(packageConfig.url).hostname], download: async ({ url }) => download(fetchImpl, url) });
  const verifier = createProductionPackageVerifier({ architectureVersion: options.architectureVersion ?? "2.02", nodeVersion: nodeConfig.version, productId: packageConfig.productId, runtimeVersion: options.runtimeVersion ?? "1.0" });
  const bootstrap = createProductCoreBootstrapService({ repository: siteRepository, workspace });
  const globalCommand = createGlobalWpscCommandService({ commandPath: options.commandPath ?? "/usr/local/bin/wpsc" });
  const runtimeProbe = async () => httpProbe(fetchImpl, `http://${runtime.host}:${runtime.port}/health`, options.runtimeHost);
  const systemd = createSystemdRuntimeInstaller({ probe: runtimeProbe, systemctlPath: options.systemctlPath });
  const nginx = createNginxInstaller({ nginxPath: options.nginxPath });
  const node = createNodeDistributionService({
    allowedHosts: [new URL(nodeConfig.selected.file.url).hostname],
    download: async ({ url }) => download(fetchImpl, url),
    extract: options.nodeAdapters?.extract ?? missingNodeAdapter("extract"),
    fetchMetadata: options.nodeAdapters?.fetchMetadata ?? missingNodeAdapter("fetchMetadata"),
    inspectArchive: options.nodeAdapters?.inspectArchive ?? missingNodeAdapter("inspectArchive"),
    inspectVersion: options.nodeAdapters?.inspectVersion ?? inspectNodeVersion(execFile),
    matrix: { majors: [Number(nodeConfig.version.split(".")[0])] }
  });

  async function preflight() {
    const runtimePrerequisite = await validateRuntimePrerequisites(workspace);
    if (!runtimePrerequisite.ok) return runtimePrerequisite;
    const currentRegistry = await saveRegistry(registry, installationId, workspace);
    await installationState.save({ activeCore: `releases/${packageConfig.version}`, coreVersion: packageConfig.version, installationId, nodeVersion: nodeConfig.version, productVersion: packageConfig.version, runtimeUser: runtime.user, state: "INSTALLING", workspace });
    return { diagnostics: { errors: [], warnings: [] }, ok: true, registry: currentRegistry };
  }
  const commandComponent = { install: async () => globalCommand.install({ registry: await registry.read() }) };
  const systemdInput = { installationId, port: runtime.port, runtimeGroup: runtime.group, runtimeUser: runtime.user, workspace };
  const nginxInput = { domain, installationId, publicRoot: options.publicRoot ?? path.join(workspace, "public"), runtimeOrigin: `http://${runtime.host}:${runtime.port}`, workspace };
  const healthChecks = createDefaultInstallationHealthChecks({
    commandPath: options.commandPath ?? "/usr/local/bin/wpsc",
    nginx: { validate: async () => { const result = await probes.nginx(); return { details: result, ok: result.ok }; } },
    registry,
    runtimeProbe: async () => probes.runtime(),
    systemd: { isActive: async () => (await probes.systemd()).ok }
  });
  const baseHealth = createInstallationHealthService({ checks: healthChecks, installationState, registry, workspace });
  const health = {
    ...baseHealth,
    inspect: async (input) => {
      const result = await baseHealth.inspect(input);
      if (result.state === "HEALTHY") await installationState.save({ installationId, state: "READY", workspace });
      return result;
    }
  };
  const probes = createRealVpsAcceptanceProbes({ commandPath: options.commandPath, domain, domainUrl: options.domainUrl, execFile, fetch: fetchImpl, installationId, nginxPath: options.nginxPath, runtimeGroup: runtime.group, runtimeHost: options.runtimeHost, runtimeUrl: `http://${runtime.host}:${runtime.port}/health`, runtimeUser: runtime.user, systemctlPath: options.systemctlPath, workspace });
  const installer = createProductInstallerOrchestrator({ components: { acquisition, bootstrap, globalCommand: commandComponent, health, nginx, node, package: verifier, preflight, systemd } });
  const maintenance = createInstallationMaintenanceService({
    handlers: {
      "activate-nginx": () => nginx.install(nginxInput),
      "install-global-command": () => commandComponent.install(),
      "install-node": () => node.install(nodeConfig),
      "install-systemd": () => systemd.install(systemdInput),
      "prepare-directories": async () => ({ ok: true })
    }
  });
  const databaseFingerprint = createDatabaseFingerprint(options.database, execFile);

  return Object.freeze({
    databaseFingerprint,
    health,
    input: {
      health: {},
      installation: {
        acquisition: packageConfig,
        bootstrap: { environment: options.environment ?? "production" },
        globalCommand: {},
        health: {},
        nginx: nginxInput,
        node: nodeConfig,
        ownerId: options.ownerId ?? "c048-vps",
        package: { publicKey, targetDir: path.join(workspace, "storage", "installer", "extracted", packageConfig.version) },
        systemd: systemdInput
      },
      installationId,
      maintenance: { context: { domain } },
      ownerId: options.ownerId ?? "c048-vps"
    },
    installer,
    maintenance,
    probes
  });
}

async function validateRuntimePrerequisites(workspace) {
  const required = [
    ["runtime.config.js", path.join(workspace, "runtime.config.js")],
    ["config/runtime.env", path.join(workspace, "config", "runtime.env")]
  ];
  for (const [name, file] of required) {
    try { await access(file); }
    catch { return { diagnostics: { errors: [{ code: "installation.runtime.prerequisite_missing", message: `C048 requires ${name} before systemd Runtime installation.`, severity: "error" }], warnings: [] }, ok: false }; }
  }
  return { diagnostics: { errors: [], warnings: [] }, ok: true };
}

async function saveRegistry(service, installationId, workspace) { try { const current = await service.read(); return service.save({ defaultInstallation: current.defaultInstallation ?? installationId, expectedRevision: current.revision, installations: { [installationId]: { workspace } } }); } catch (error) { if (error.code !== "ENOENT") throw error; return service.save({ defaultInstallation: installationId, installations: { [installationId]: { workspace } } }); } }
function validatePackage(value = {}, workspace, installationId) { const result = { installationId, productId: value.productId ?? "wpsc", publicKeyPath: path.resolve(value.publicKeyPath ?? path.join(workspace, "config", "core-update-public.pem")), sha256: String(value.sha256 ?? ""), size: Number(value.size), targetDir: path.resolve(value.targetDir ?? path.join(workspace, "storage", "installer", "packages", String(value.version))), url: String(value.url ?? ""), version: String(value.version ?? "") }; new URL(result.url); if (!/^\d+\.\d+\.\d+$/.test(result.version) || !/^[a-f0-9]{64}$/.test(result.sha256) || !Number.isSafeInteger(result.size) || result.size <= 0) throw new TypeError("C048 Production package metadata is invalid."); return result; }
function validateNode(value = {}, workspace, installationId) { const version = String(value.version ?? "").replace(/^v/, ""); const file = { archiveType: value.archiveType ?? "tar.xz", sha256: String(value.sha256 ?? "0".repeat(64)), size: Number(value.size ?? 0), url: String(value.url ?? "https://nodejs.org/dist/") }; if (!/^\d+\.\d+\.\d+$/.test(version)) throw new TypeError("C048 Node version is invalid."); return { installationId, selected: { file, version }, target: path.join(workspace, "runtime", "node"), version }; }
function inspectNodeVersion(execFile) { return async (target) => (await execFile(path.join(target, "bin", "node"), ["--version"], { encoding: "utf8" })).stdout.trim(); }
function missingNodeAdapter(name) { return async () => { throw new Error(`Node ${name} adapter is required when the certified Node runtime is not already installed.`); }; }
async function download(fetchImpl, url) { const response = await fetchImpl(url, { redirect: "follow" }); if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`); return { bytes: Buffer.from(await response.arrayBuffer()), url: response.url || url }; }
async function httpProbe(fetchImpl, url, host) { try { const response = await fetchImpl(url, { headers: host ? { host } : undefined, redirect: "manual" }); return { ok: response.status >= 200 && response.status < 500, status: response.status }; } catch { return { ok: false }; } }
function createDatabaseFingerprint(value = {}, execFile) { const command = value.fingerprintCommand; if (!Array.isArray(command) || command.length === 0 || !path.isAbsolute(command[0])) throw new TypeError("C048 database.fingerprintCommand must be an absolute executable and arguments array."); return async () => { const result = await execFile(command[0], command.slice(1), { encoding: "utf8", maxBuffer: 1024 * 1024 }); const digest = result.stdout.trim(); if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("Database fingerprint command did not return one lowercase SHA-256 digest."); return digest; }; }
function required(value, label) { const result = String(value ?? "").trim(); if (!result) throw new TypeError(`${label} is required for C048 VPS composition.`); return result; }
