import { cp, lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdateStagingService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  async function stage(input = {}) {
    if (!input.packageDir || !input.version) throw new TypeError("Core Update staging requires packageDir and version.");
    const target = path.join(workspaceDir, "core", "releases", String(input.version));
    const active = path.join(workspaceDir, "core", "active");
    try { await lstat(target); return failure("core_update.staging.exists", "Staged release already exists."); } catch (error) { if (error.code !== "ENOENT") throw error; }
    await mkdir(path.dirname(target), { recursive: true });
    try { await cp(path.resolve(input.packageDir), target, { errorOnExist: true, force: false, recursive: true }); await writeFile(path.join(target, ".wpsc-staged.json"), JSON.stringify({ packageId: input.packageId ?? null, version: input.version })); }
    catch (error) { await rm(target, { force: true, recursive: true }); return failure("core_update.staging.failed", error.message); }
    const activeBefore = await readActive(active);
    const activeAfter = await readActive(active);
    if (activeBefore !== activeAfter) { await rm(target, { force: true, recursive: true }); return failure("core_update.staging.active_changed", "Active Core changed during staging."); }
    return success({ active: activeAfter, path: target, staged: true, version: String(input.version) });
  }
  async function inspect(version) { try { const marker = JSON.parse(await readFile(path.join(workspaceDir, "core", "releases", String(version), ".wpsc-staged.json"), "utf8")); return marker.version === String(version) ? success({ staged: true, version: String(version) }) : failure("core_update.staging.incomplete", "Staged release marker is invalid."); } catch { return failure("core_update.staging.incomplete", "Staged release is incomplete."); } }
  return Object.freeze({ inspect, stage });
}
async function readActive(file) { try { return await readFile(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
