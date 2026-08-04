import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import createAtomicJsonStore from "./createAtomicJsonStore.js";

export default function createInstallationRegistryService(options = {}) {
  const store = options.store ?? createAtomicJsonStore(options.path ?? "/etc/wpsc/installations.json", options.storeOptions);
  const lockPath = options.lockPath ?? `${store.path}.lock`;
  const lockRetries = options.lockRetries ?? 100;
  const lockRetryMs = options.lockRetryMs ?? 5;

  async function read() { return normalize(await store.read()); }
  async function save(input = {}) {
    return locked(async () => {
      let current;
      try { current = await read(); } catch (error) { if (error.code !== "ENOENT") throw error; }
      for (const [id, value] of Object.entries(input.installations ?? {})) {
        if (current?.installations[id] && path.resolve(value.workspace) !== current.installations[id].workspace) {
          const error = new Error(`Installation ${id} workspace cannot change after registration.`);
          error.code = "installation.registry.identity_mismatch";
          throw error;
        }
      }
      if (current && input.expectedRevision !== undefined && input.expectedRevision !== current.revision) {
        const error = new Error("Installation registry revision is stale.");
        error.code = "installation.registry.revision_stale";
        throw error;
      }
      const registry = normalize({
        ...current,
        ...input,
        installations: { ...(current?.installations ?? {}), ...(input.installations ?? {}) },
        revision: (current?.revision ?? -1) + 1
      });
      await store.write(registry);
      return registry;
    });
  }
  async function locked(action) {
    await mkdir(path.dirname(lockPath), { recursive: true });
    const handle = await acquireLock();
    try { return await action(); }
    finally { await handle.close(); await unlink(lockPath).catch(() => {}); }
  }
  async function acquireLock() {
    for (let attempt = 0; attempt <= lockRetries; attempt += 1) {
      try { return await open(lockPath, "wx", 0o600); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (attempt === lockRetries) {
          const conflict = new Error("Another Installation registry writer is active.");
          conflict.code = "installation.registry.lock_active";
          throw conflict;
        }
        await new Promise((resolve) => setTimeout(resolve, lockRetryMs));
      }
    }
  }
  return Object.freeze({ path: store.path, read, save });
}

function normalize(input = {}) {
  const installations = Object.fromEntries(Object.entries(input.installations ?? {}).map(([id, value]) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Installation id is invalid.");
    return [id, Object.freeze({ workspace: path.resolve(String(value.workspace ?? "")) })];
  }));
  const defaultInstallation = input.defaultInstallation ?? null;
  if (defaultInstallation && !installations[defaultInstallation]) throw new TypeError("Default Installation is not registered.");
  return Object.freeze({ defaultInstallation, installations: Object.freeze(installations), revision: Number.isInteger(input.revision) && input.revision >= 0 ? input.revision : 0, schema: "wpsc.installation-registry", schemaVersion: 1 });
}
