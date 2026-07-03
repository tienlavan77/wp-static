import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import validateConfig from "./validateConfig.js";

export default async function loadConfig(projectDir) {
  const configPath = path.resolve(projectDir, "wpsc.config.js");

  try {
    await access(configPath);
  } catch {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const module = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);

  return validateConfig(module.default);
}
