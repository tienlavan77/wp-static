import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import createInputHash from "../incremental/createInputHash.js";

export default function createRouteRenderCache(options = {}) {
  const cacheDir = options.cacheDir;

  if (!cacheDir) {
    return null;
  }

  return {
    createKey(route, theme) {
      return createInputHash({
        content: route.content,
        path: route.path,
        theme
      });
    },
    async get(key) {
      try {
        return await readFile(resolveRouteCachePath(cacheDir, key), "utf8");
      } catch {
        return null;
      }
    },
    async set(key, html) {
      const filePath = resolveRouteCachePath(cacheDir, key);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, html, "utf8");
    }
  };
}

function resolveRouteCachePath(cacheDir, key) {
  return path.join(cacheDir, "routes", `${key}.html`);
}
