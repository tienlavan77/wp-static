import { access, mkdir, open, readFile, readlink, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import createAtomicJsonStore from "./createAtomicJsonStore.js";

export const InstallationHealthState = Object.freeze({ DEGRADED: "DEGRADED", FAILED: "FAILED", HEALTHY: "HEALTHY" });
export const REQUIRED_INSTALLATION_HEALTH_CHECKS = Object.freeze(["installation-state", "registry", "node", "core", "global-command", "systemd", "runtime", "nginx"]);

export default function createInstallationHealthService(options = {}) {
  const workspace = path.resolve(options.workspace);
  const checks = options.checks ?? createDefaultInstallationHealthChecks(options);
  const store = options.store ?? createAtomicJsonStore(path.join(workspace, "storage", "installer", "health.json"), options.storeOptions);
  const reportPath = options.reportPath ?? path.join(workspace, "storage", "installer", "reports", "installation-health.md");
  const now = options.now ?? (() => new Date().toISOString());

  async function inspect(input = {}) {
    const installation = input.installation ?? await options.installationState?.read();
    validateIdentity(installation, workspace);
    const previous = await readOptional(store);
    const results = [];
    for (const name of REQUIRED_INSTALLATION_HEALTH_CHECKS) {
      const definition = checks[name];
      if (!definition || typeof definition.check !== "function") results.push(result(name, false, "critical", {}, "Required health check is not configured."));
      else {
        try { const value = await definition.check({ installation, workspace }); results.push(result(name, value?.ok === true, definition.severity ?? "critical", sanitize(value?.details ?? {}), value?.message ?? null)); }
        catch (error) { results.push(result(name, false, definition.severity ?? "critical", {}, "Health check failed. Inspect redacted diagnostics.")); }
      }
    }
    const state = results.some((item) => !item.ok && item.severity === "critical") ? InstallationHealthState.FAILED : results.some((item) => !item.ok) ? InstallationHealthState.DEGRADED : InstallationHealthState.HEALTHY;
    const matrix = Object.freeze({ checkedAt: now(), installation: identity(installation), results: Object.freeze(results), revision: (previous?.revision ?? -1) + 1, schema: "wpsc.installation-health", schemaVersion: 1, state });
    await store.write(matrix);
    await atomicText(reportPath, renderReport(matrix));
    return Object.freeze({ matrix, ok: state !== InstallationHealthState.FAILED, reportPath, state });
  }
  async function read() { return JSON.parse(await readFile(store.path, "utf8")); }
  async function report() { const matrix = await read(); return Object.freeze({ matrix, path: reportPath, text: renderReport(matrix) }); }
  return Object.freeze({ inspect, path: store.path, read, report, reportPath });
}

export function createDefaultInstallationHealthChecks(options = {}) {
  const commandPath = options.commandPath ?? "/usr/local/bin/wpsc";
  const systemd = options.systemd ?? { isActive: async () => false };
  const runtimeProbe = options.runtimeProbe ?? (async () => ({ ok: false }));
  const nginx = options.nginx ?? { validate: async () => ({ ok: false }) };
  return Object.freeze({
    "installation-state": { check: async ({ installation, workspace }) => ({ details: { revision: installation.revision, workspace }, ok: installation.workspace === workspace }) },
    registry: { check: async ({ installation }) => { const registry = await options.registry.read(); return { details: { installationId: installation.installationId }, ok: registry.installations?.[installation.installationId]?.workspace === installation.workspace }; } },
    node: { check: async ({ workspace }) => fileCheck(path.join(workspace, "runtime", "node", "bin", "node"), { executable: true }) },
    core: { check: async ({ installation, workspace }) => { const pointer = await readlink(path.join(workspace, "core", "active")); await access(path.join(workspace, "core", "active", "framework", "src", "cli", "index.js")); return { details: { activeCore: pointer }, ok: pointer === installation.activeCore }; } },
    "global-command": { check: async () => fileCheck(commandPath, { executable: true }) },
    systemd: { check: async ({ installation }) => ({ details: { unit: `wpsc-runtime-${installation.installationId}.service` }, ok: await systemd.isActive(`wpsc-runtime-${installation.installationId}.service`) }) },
    runtime: { check: async ({ installation }) => runtimeProbe({ installationId: installation.installationId }) },
    nginx: { check: async ({ installation }) => nginx.validate({ installationId: installation.installationId }) }
  });
}

function validateIdentity(installation, workspace) { if (installation?.schema !== "wpsc.installation" || installation.schemaVersion !== 1 || installation.workspace !== workspace || !installation.installationId) throw new TypeError("Installation health identity is invalid or belongs to another workspace."); }
function identity(value) { return Object.freeze({ activeCore: value.activeCore, coreVersion: value.coreVersion, installationId: value.installationId, nodeVersion: value.nodeVersion, productVersion: value.productVersion, runtimeUser: value.runtimeUser, workspace: value.workspace }); }
function result(name, ok, severity, details, message) { return Object.freeze({ details, message, name, ok, severity }); }
async function fileCheck(file, input = {}) { await access(file, input.executable ? 1 : 0); return { details: { path: file }, ok: true }; }
async function readOptional(store) { try { return await store.read(); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function sanitize(value) { if (Array.isArray(value)) return value.map(sanitize); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|token|secret|credential|private.?key/i.test(key) ? "[REDACTED]" : sanitize(item)])); return value; }
function renderReport(matrix) { const lines = ["# WPSC Installation Health Report", "", `- Installation: ${matrix.installation.installationId}`, `- Workspace: ${matrix.installation.workspace}`, `- Product: ${matrix.installation.productVersion ?? "unknown"}`, `- Core: ${matrix.installation.coreVersion ?? "unknown"}`, `- Node: ${matrix.installation.nodeVersion ?? "unknown"}`, `- Active Core: ${matrix.installation.activeCore ?? "missing"}`, `- Runtime User: ${matrix.installation.runtimeUser}`, `- State: ${matrix.state}`, `- Revision: ${matrix.revision}`, `- Checked At: ${matrix.checkedAt}`, "", "## Health Matrix", "", "| Check | Severity | Result | Message |", "| --- | --- | --- | --- |"]; for (const item of matrix.results) lines.push(`| ${item.name} | ${item.severity} | ${item.ok ? "PASS" : "FAIL"} | ${item.message ?? ""} |`); return `${lines.join("\n")}\n`; }
async function atomicText(target, content) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.${process.pid}.tmp`; await rm(temporary, { force: true }); const handle = await open(temporary, "wx", 0o600); try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); } await rename(temporary, target); }
