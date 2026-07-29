import { readFile } from "node:fs/promises";

export default async function loadRuntimeEnvironment(filePath) {
  try {
    const lines = (await readFile(filePath, "utf8")).split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trimStart().startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      if (key && value) process.env[key] = value;
    }
    return { ok: true };
  } catch (error) { return error.code === "ENOENT" ? { ok: true } : { error, ok: false }; }
}
