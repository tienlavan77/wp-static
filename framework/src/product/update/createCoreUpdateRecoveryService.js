import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdateRecoveryService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const now = options.now ?? (() => new Date().toISOString());
  const root = path.join(workspaceDir, "storage", "updates", "recovery");
  const writeRecoveryManifest = options.writeRecoveryManifest ?? writeJson;
  const protectedFiles = ["config/wpsc.json", "storage/migrations/product.json", "storage/updates/core-update.json", "core/active"];
  async function create(input = {}) {
    const id = String(input.recoveryId ?? `recovery-${Date.now()}`);
    const target = path.join(root, id);
    const files = [];
    await mkdir(target, { recursive: true });
    for (const relative of protectedFiles) {
      const source = path.join(workspaceDir, relative);
      try { await cp(source, path.join(target, relative), { recursive: true }); files.push({ path: relative, sha256: hash(await readFile(source)) }); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    const record = { createdAt: now(), files, recoveryId: id, schema: "wpsc.core-update-recovery", schemaVersion: 1 };
    await writeRecoveryManifest(path.join(target, "recovery.json"), record);
    return success({ recovery: deepFreeze(record), path: target });
  }
  async function restore(recoveryId) {
    const target = path.join(root, String(recoveryId));
    const record = JSON.parse(await readFile(path.join(target, "recovery.json"), "utf8"));
    if (!Array.isArray(record.files) || record.files.some((file) => !protectedFiles.includes(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256))) throw new Error("Recovery manifest is invalid.");
    for (const file of record.files) { const source = path.join(target, file.path); if (hash(await readFile(source)) !== file.sha256) throw new Error(`Recovery integrity verification failed: ${file.path}.`); }
    for (const file of record.files) { const destination = path.join(workspaceDir, file.path); await mkdir(path.dirname(destination), { recursive: true }); await rm(destination, { force: true, recursive: true }); await cp(path.join(target, file.path), destination, { recursive: true }); }
    return success({ restored: record.recoveryId });
  }
  return Object.freeze({ create, restore });
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await writeFile(tmp, JSON.stringify(value)); await rename(tmp, file); }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
