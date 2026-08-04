import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import createAtomicJsonStore from "./createAtomicJsonStore.js";
import { createInstallationState } from "./installationContract.js";

export default function createInstallationStateService(options = {}) {
  const workspace = path.resolve(options.workspace ?? process.cwd());
  const store = options.store ?? createAtomicJsonStore(path.join(workspace, "config", "installation-state.json"), options.storeOptions);
  const lockPath = options.lockPath ?? `${store.path}.lock`;
  const now = options.now ?? (() => new Date().toISOString());

  async function read() { return createInstallationState(await store.read()); }
  async function save(input = {}) {
    return locked(async () => {
      let current;
      try { current = await read(); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (current && input.installationId && input.installationId !== current.installationId) throw conflict("installation.identity.immutable", "Installation id cannot change after creation.");
      if (current && input.workspace && path.resolve(input.workspace) !== current.workspace) throw conflict("installation.workspace.immutable", "Installation workspace cannot change after creation.");
      if (current && input.expectedRevision !== undefined && input.expectedRevision !== current.revision) throw conflict("installation.revision.stale", "Installation state revision is stale.");
      const installation = createInstallationState({ ...current, ...input, revision: (current?.revision ?? -1) + 1, updatedAt: now(), workspace });
      await store.write(installation);
      return success({ installation });
    });
  }
  async function locked(action) {
    await mkdir(path.dirname(lockPath), { recursive: true });
    let handle;
    try { handle = await open(lockPath, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") throw conflict("installation.state.lock_active", "Another Installation state writer is active."); throw error; }
    try { return await action(); } finally { await handle.close(); await unlink(lockPath).catch(() => {}); }
  }
  return Object.freeze({ path: store.path, read, save });
}

function success(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function conflict(code, message) { const error = new Error(message); error.code = code; return error; }
