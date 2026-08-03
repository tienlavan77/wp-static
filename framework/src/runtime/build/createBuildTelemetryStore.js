import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export default function createBuildTelemetryStore({ repository, limit = 50 } = {}) {
  if (!repository?.resolveSiteRoot) throw new TypeError("Build Telemetry Store requires Site Repository.");
  const file = (siteId) => path.join(repository.resolveSiteRoot(siteId), "storage", "build", "history.json");
  return Object.freeze({
    async record(siteId, entry) {
      let history = [];
      try { history = JSON.parse(await readFile(file(siteId), "utf8")).entries || []; } catch {}
      history = [...history, entry].slice(-limit);
      const target = file(siteId); await mkdir(path.dirname(target), { recursive: true });
      await writeFile(`${target}.tmp`, `${JSON.stringify({ entries: history, schema: "wpsc.build-history", schemaVersion: 1 }, null, 2)}\n`); await rename(`${target}.tmp`, target);
      return { entries: history, path: target };
    }
  });
}
