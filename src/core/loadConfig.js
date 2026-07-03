import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import normalizeConfigPaths from "./normalizeConfigPaths.js";
import validateConfig from "./validateConfig.js";
import { ConfigError } from "../shared/errors.js";

export default async function loadConfig(projectDir) {
  const absoluteProjectDir = path.resolve(projectDir);
  const configPath = path.resolve(absoluteProjectDir, "wpsc.config.js");

  try {
    await access(configPath);
  } catch {
    throw new ConfigError(`Config file not found: ${configPath}`);
  }

  const module = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const config = validateConfig(module.default);

  return normalizeConfigPaths(config, absoluteProjectDir);
}
