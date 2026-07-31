import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import createInputHash from "../incremental/createInputHash.js";

export default function createJsonFileCache(options = {}) {
  const cacheDir = options.cacheDir;
  const namespace = options.namespace ?? "default";

  if (!cacheDir) {
    return null;
  }

  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(resolveCachePath(cacheDir, namespace, key), "utf8"));
      } catch {
        return null;
      }
    },
    async set(key, value) {
      const filePath = resolveCachePath(cacheDir, namespace, key);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
    }
  };
}

export function createCacheKey(value) {
  return createInputHash(value);
}

function resolveCachePath(cacheDir, namespace, key) {
  return path.join(cacheDir, namespace, `${key}.json`);
}
