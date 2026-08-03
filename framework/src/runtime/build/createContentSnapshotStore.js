import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONTENT_SNAPSHOT_SCHEMA = "wpsc.site-content-snapshot";
export const CONTENT_SNAPSHOT_VERSION = 1;

function validSnapshot(value, siteId) {
  return Boolean(value
    && value.schema === CONTENT_SNAPSHOT_SCHEMA
    && value.schemaVersion === CONTENT_SNAPSHOT_VERSION
    && value.siteId === String(siteId)
    && typeof value.buildId === "string" && value.buildId
    && Array.isArray(value.items)
    && value.collections && typeof value.collections === "object" && !Array.isArray(value.collections));
}

export default function createContentSnapshotStore(options = {}) {
  const repository = options.repository;
  if (!repository?.resolveSiteRoot) throw new TypeError("Content Snapshot Store requires a Site Repository.");
  const filePath = (siteId) => path.join(repository.resolveSiteRoot(siteId), "storage", "build", "content-snapshot.json");
  return Object.freeze({
    async load(siteId) {
      try {
        const snapshot = JSON.parse(await readFile(filePath(siteId), "utf8"));
        return validSnapshot(snapshot, siteId) ? snapshot : null;
      } catch { return null; }
    },
    async save(input = {}) {
      if (!input.siteId || !input.buildId || !Array.isArray(input.items) || !input.collections || typeof input.collections !== "object") {
        throw new TypeError("Content Snapshot requires siteId, buildId, items, and collections.");
      }
      const snapshot = { buildId: String(input.buildId), collections: input.collections, items: input.items, schema: CONTENT_SNAPSHOT_SCHEMA, schemaVersion: CONTENT_SNAPSHOT_VERSION, siteId: String(input.siteId) };
      const target = filePath(snapshot.siteId);
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${snapshot.buildId}.tmp`;
      await writeFile(temporary, `${JSON.stringify(snapshot)}\n`, "utf8");
      await rename(temporary, target);
      return { path: target, snapshot };
    }
  });
}
