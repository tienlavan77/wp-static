import { access, lstat, mkdir, readlink, rename, rm, symlink } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdateActivationService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const renamePointer = options.renamePointer ?? rename;
  async function activate(version) {
    const release = path.join(workspaceDir, "core", "releases", String(version));
    try { await access(release); const marker = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(release, ".wpsc-staged.json"), "utf8")); if (marker.version !== String(version)) throw new Error("marker"); } catch { return fail("core_update.activation.release_invalid", "Verified staged release is missing or invalid."); }
    const active = path.join(workspaceDir, "core", "active"); await mkdir(path.dirname(active), { recursive: true });
    const previous = await read(active); const temporary = `${active}.${process.pid}.tmp`;
    await rm(temporary, { force: true }); await symlink(`releases/${version}`, temporary); await renamePointer(temporary, active);
    return ok({ activeVersion: String(version), previousPointer: previous });
  }
  return Object.freeze({ activate });
}
async function read(file) { try { return await readlink(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function ok(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function fail(code, message) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
