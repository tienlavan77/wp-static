import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";
import createPrivilegedInstallationExecutor from "./createPrivilegedInstallationExecutor.js";
import { createInstallationPlan, InstallationOperationMode, PrivilegedInstallationOperation } from "./installationContract.js";

const defaultProtected = Object.freeze(["config/runtime.env", "config/wpsc.json", "sites", "public", "storage/data.db", "core/active"]);

export default function createInstallationMaintenanceService(options = {}) {
  const handlers = options.handlers ?? {};
  const inspectors = options.inspectors ?? [];
  const operationSets = options.operationSets ?? {
    REINSTALL: [PrivilegedInstallationOperation.INSTALL_NODE, PrivilegedInstallationOperation.PREPARE_DIRECTORIES, PrivilegedInstallationOperation.INSTALL_GLOBAL_COMMAND, PrivilegedInstallationOperation.INSTALL_SYSTEMD, PrivilegedInstallationOperation.ACTIVATE_NGINX],
    REPAIR: [PrivilegedInstallationOperation.PREPARE_DIRECTORIES, PrivilegedInstallationOperation.INSTALL_GLOBAL_COMMAND, PrivilegedInstallationOperation.INSTALL_SYSTEMD, PrivilegedInstallationOperation.ACTIVATE_NGINX],
    VERIFY: []
  };

  async function run(input = {}) {
    const workspace = path.resolve(input.workspace);
    const mode = input.mode ?? InstallationOperationMode.VERIFY;
    if (![InstallationOperationMode.VERIFY, InstallationOperationMode.REPAIR, InstallationOperationMode.REINSTALL].includes(mode)) return failure("installation.maintenance.mode_invalid", "Maintenance mode is not supported by C046.");
    const protectedPaths = input.protectedPaths ?? defaultProtected;
    const protectedBefore = await snapshotPaths(workspace, protectedPaths);
    const workspaceBefore = input.dryRun ? await fingerprint(workspace) : null;
    const operations = (operationSets[mode] ?? []).map((type) => ({ arguments: { ...(input.context ?? {}), installationId: input.installationId, workspace }, type }));
    const plan = createInstallationPlan({ dryRun: input.dryRun === true, installationId: input.installationId, mode, operations, workspace });
    try {
      const verification = [];
      for (const inspect of inspectors) verification.push(await inspect({ installationId: input.installationId, mode, workspace }));
      const execution = await createPrivilegedInstallationExecutor({ handlers }).execute(plan);
      const protectedAfter = await snapshotPaths(workspace, protectedPaths);
      if (JSON.stringify(protectedAfter) !== JSON.stringify(protectedBefore)) return failure("installation.maintenance.protected_state_changed", "Maintenance changed protected Site, credential, public, database or Core state.", { plan, protectedAfter, protectedBefore });
      if (input.dryRun && await fingerprint(workspace) !== workspaceBefore) return failure("installation.maintenance.dry_run_mutated", "Dry-run changed the Installation workspace.", { plan });
      return Object.freeze({ diagnostics: { errors: [], warnings: [] }, execution, mode, ok: true, plan, protectedState: protectedAfter, verification });
    } catch (error) {
      const protectedAfter = await snapshotPaths(workspace, protectedPaths);
      return failure("installation.maintenance.failed", error.message, { plan, protectedAfter, protectedBefore });
    }
  }
  return Object.freeze({ run });
}

async function snapshotPaths(workspace, paths) { const result = {}; for (const relative of [...paths].sort()) result[relative] = await fingerprint(path.join(workspace, relative)); return Object.freeze(result); }
async function fingerprint(target) {
  try {
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) return `symlink:${await readlink(target)}`;
    if (metadata.isFile()) return `file:${metadata.size}:${hash(await readFile(target))}`;
    if (metadata.isDirectory()) { const entries = []; for (const name of (await readdir(target)).sort()) entries.push([name, await fingerprint(path.join(target, name))]); return `directory:${hash(JSON.stringify(entries))}`; }
    return `special:${metadata.mode}`;
  } catch (error) { if (error.code === "ENOENT") return "absent"; throw error; }
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function failure(code, message, data = {}) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
