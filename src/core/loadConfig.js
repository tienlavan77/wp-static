import { access, readFile } from "node:fs/promises";
import path from "node:path";
import normalizeConfigPaths from "./normalizeConfigPaths.js";
import validateConfig from "./validateConfig.js";
import { ConfigError } from "../shared/errors.js";
import importProjectModule from "../shared/importProjectModule.js";

export default async function loadConfig(projectDir) {
  const absoluteProjectDir = path.resolve(projectDir);
  const configPath = path.resolve(absoluteProjectDir, "wpsc.config.js");

  await loadProjectEnv(absoluteProjectDir);

  try {
    await access(configPath);
  } catch {
    throw new ConfigError(`Config file not found: ${configPath}`);
  }

  const module = await importProjectModule(configPath);
  const config = validateConfig(module.default);

  return normalizeConfigPaths(config, absoluteProjectDir);
}

async function loadProjectEnv(projectDir) {
  const envPath = path.resolve(projectDir, ".env");
  let envText = "";

  try {
    envText = await readFile(envPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const line of envText.split(/\r?\n/)) {
    const entry = parseEnvLine(line);

    if (!entry || process.env[entry.key] !== undefined) {
      continue;
    }

    process.env[entry.key] = entry.value;
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return { key, value };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
