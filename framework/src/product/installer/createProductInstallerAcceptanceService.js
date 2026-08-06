import createAtomicJsonStore from "./createAtomicJsonStore.js";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";
import { isRealVpsAcceptanceProbe } from "./createRealVpsAcceptanceProbes.js";

export default function createProductInstallerAcceptanceService(options = {}) {
  const workspace = path.resolve(options.workspace);
  const installer = options.installer;
  const maintenance = options.maintenance;
  const health = options.health;
  const snapshot = options.snapshot;
  const probes = options.probes ?? {};
  const now = options.now ?? (() => new Date().toISOString());
  const store = options.store ?? createAtomicJsonStore(path.join(workspace, "storage", "installer", "c048-vps-evidence.json"), options.storeOptions);
  validateDependencies({ health, installer, maintenance, snapshot });

  async function run(input = {}) {
    if (input.confirmed !== true) return failure("installation.acceptance.confirmation_required", "Real VPS acceptance requires explicit confirmation.");
    const baseline = await snapshot({ phase: "baseline", workspace });
    const dryRun = await maintenance.run({ ...(input.maintenance ?? {}), dryRun: true, installationId: input.installationId, mode: "REINSTALL", workspace });
    requireOk(dryRun, "installation.acceptance.dry_run_failed");
    const afterDryRun = await snapshot({ phase: "after-dry-run", workspace });
    assertProtected(baseline, afterDryRun, "dry-run");

    const installation = await installer.install({ ...(input.installation ?? {}), installationId: input.installationId, ownerId: input.ownerId, workspace });
    if (!installation.ok || installation.state !== "COMPLETED") {
      const reason = installation.diagnostics?.errors?.[0]?.code ?? installation.transaction?.error?.code ?? "unknown";
      throw coded("installation.acceptance.install_failed", `C047 Installer did not reach COMPLETED (state: ${installation.state ?? "unknown"}; reason: ${reason}). Inspect ${path.join(workspace, "storage", "installer", "transaction.json")}.`);
    }
    const healthResult = await health.inspect(input.health ?? {});
    if (healthResult.state !== "HEALTHY") throw coded("installation.acceptance.health_failed", `Installation health is ${healthResult.state}.`);
    const probeResults = {};
    for (const name of ["global-command", "systemd", "runtime", "nginx"]) {
      if (typeof probes[name] !== "function") throw coded("installation.acceptance.probe_missing", `Required VPS probe ${name} is missing.`);
      if (options.requireRealProbes && !isRealVpsAcceptanceProbe(probes[name])) throw coded("installation.acceptance.probe_not_real", `Required VPS probe ${name} is not a real production probe.`);
      const result = await probes[name]({ installationId: input.installationId, workspace });
      if (result?.ok !== true) throw coded("installation.acceptance.probe_failed", `Required VPS probe ${name} failed.`);
      probeResults[name] = sanitize(result);
    }
    const verification = await maintenance.run({ ...(input.maintenance ?? {}), installationId: input.installationId, mode: "VERIFY", workspace });
    requireOk(verification, "installation.acceptance.verify_failed");
    const after = await snapshot({ phase: "after-install", workspace });
    assertProtected(baseline, after, "installation");
    const evidence = Object.freeze({
      after,
      baseline,
      completedAt: now(),
      dryRun: { mode: dryRun.mode, ok: dryRun.ok },
      health: { reportPath: healthResult.reportPath, state: healthResult.state },
      installation: { installationId: input.installationId, state: installation.state, transactionId: installation.transaction?.transactionId },
      nodeVersion: input.nodeVersion ?? process.version,
      probes: probeResults,
      schema: "wpsc.c048-vps-acceptance",
      schemaVersion: 1,
      status: "PASS",
      verification: { mode: verification.mode, ok: verification.ok },
      workspace
    });
    await store.write(evidence);
    return Object.freeze({ evidence, evidencePath: store.path, ok: true, status: "PASS" });
  }
  return Object.freeze({ evidencePath: store.path, run });
}

function validateDependencies(value) { if (typeof value.installer?.install !== "function" || typeof value.maintenance?.run !== "function" || typeof value.health?.inspect !== "function" || typeof value.snapshot !== "function") throw new TypeError("C048 acceptance requires Installer, maintenance, health and protected-state snapshot dependencies."); }
function requireOk(value, code) { if (!value?.ok) throw coded(code, "VPS acceptance operation failed. Inspect redacted component diagnostics."); }
function assertProtected(before, after, phase) { for (const key of ["siteConfiguration", "credentials", "publicOutput", "database"]) if (before?.[key] !== after?.[key]) throw coded("installation.acceptance.protected_state_changed", `Protected ${key} changed during ${phase}.`); }
function sanitize(value) { if (Array.isArray(value)) return value.map(sanitize); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|token|secret|credential|private.?key/i.test(key) ? "[REDACTED]" : sanitize(item)])); return value; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
function failure(code, message) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, status: "BLOCKED" }); }

export function createProtectedStateSnapshot(options = {}) {
  const workspace = path.resolve(options.workspace);
  const groups = options.groups ?? {
    credentials: ["config/runtime.env", "sites"],
    database: ["storage/data.db"],
    publicOutput: ["public", "sites"],
    siteConfiguration: ["sites"]
  };
  return async function snapshot() {
    const result = {};
    for (const [name, paths] of Object.entries(groups)) result[name] = name === "database" && options.databaseFingerprint ? await databaseDigest(options.databaseFingerprint) : await fingerprintGroup(workspace, paths, name);
    return Object.freeze(result);
  };
}

async function fingerprintGroup(workspace, paths, group) { const hash = createHash("sha256"); for (const relative of [...paths].sort()) { hash.update(relative); hash.update(await fingerprint(path.join(workspace, relative), group)); } return hash.digest("hex"); }
async function fingerprint(target, group) {
  try {
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) return `symlink:${await readlink(target)}`;
    if (metadata.isFile()) return includeFile(target, group) ? `file:${metadata.size}:${createHash("sha256").update(await readFile(target)).digest("hex")}` : "excluded";
    if (metadata.isDirectory()) { const entries = []; for (const name of (await readdir(target)).sort()) { const value = await fingerprint(path.join(target, name), group); if (value !== "excluded") entries.push([name, value]); } return `directory:${createHash("sha256").update(JSON.stringify(entries)).digest("hex")}`; }
    return `special:${metadata.mode}`;
  } catch (error) { if (error.code === "ENOENT") return "absent"; throw error; }
}
function includeFile(file, group) { if (group === "credentials") return /credential|runtime\.env/i.test(file); if (group === "publicOutput") return file.includes(`${path.sep}public${path.sep}`); if (group === "siteConfiguration") return !/credential|runtime\.env/i.test(file) && !file.includes(`${path.sep}public${path.sep}`); return true; }
async function databaseDigest(fingerprint) { const value = await fingerprint(); if (!/^[a-f0-9]{64}$/.test(String(value))) throw coded("installation.acceptance.database_fingerprint_invalid", "Database fingerprint must be a lowercase SHA-256 digest."); return String(value); }
