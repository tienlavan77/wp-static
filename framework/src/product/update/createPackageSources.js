import { readFile } from "node:fs/promises";
import path from "node:path";

export function createLocalPackageSource(options = {}) {
  const directory = path.resolve(options.directory ?? process.cwd());
  const fileName = options.fileName ?? "releases.json";
  return Object.freeze({
    async list() {
      try {
        const value = JSON.parse(await readFile(path.join(directory, fileName), "utf8"));
        return Array.isArray(value) ? value : value.releases;
      } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    }
  });
}

export function createHttpPackageSource(options = {}) {
  if (typeof options.fetch !== "function" || !options.url) throw new TypeError("HTTP Package Source requires fetch and url.");
  return Object.freeze({
    async list() {
      const response = await options.fetch(options.url);
      if (!response.ok) throw new Error(`Package source request failed: ${response.status}.`);
      const value = await response.json();
      return Array.isArray(value) ? value : value.releases;
    }
  });
}
