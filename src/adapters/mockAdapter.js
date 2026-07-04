import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import createContent from "../core/createContent.js";
import { AdapterError } from "../shared/errors.js";

export default function createMockAdapter(options = {}) {
  const source = options.source;
  const baseDir = options.baseDir ?? process.cwd();

  if (typeof source !== "string" || source.trim() === "") {
    throw new AdapterError('Mock adapter option "source" is required.');
  }

  return {
    async getCacheKey() {
      const sourcePath = path.resolve(baseDir, source);
      const sourceStat = await stat(sourcePath);

      return {
        source: sourcePath,
        mtimeMs: sourceStat.mtimeMs,
        size: sourceStat.size
      };
    },
    async getContents() {
      const sourcePath = path.resolve(baseDir, source);
      const rawJson = await readFile(sourcePath, "utf8");
      const records = JSON.parse(rawJson);

      if (!Array.isArray(records)) {
        throw new AdapterError("Mock adapter source must contain a JSON array.");
      }

      return records.map(createContent);
    }
  };
}
