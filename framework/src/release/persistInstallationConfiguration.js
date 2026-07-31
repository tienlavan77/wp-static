import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const PERSISTENT_CONFIGURATION_VERSION = "1.0";

function assertConfiguration(configuration) {
  if (!configuration || typeof configuration !== "object") {
    throw new TypeError("Persistent Configuration requires a configuration object.");
  }

  if (configuration.ok === false) {
    const message = configuration.diagnostics?.errors?.[0]?.message || "Configuration is invalid.";
    throw new Error(message);
  }

  if (!configuration.config?.project || !configuration.config?.runtime) {
    throw new Error("Configuration must include project and runtime config.");
  }
}

async function writeJsonAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.tmp`);

  await mkdir(directory, {
    recursive: true
  });
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);

  return filePath;
}

export default async function persistInstallationConfiguration(options = {}) {
  const releaseDir = path.resolve(options.releaseDir || process.cwd());
  const configDir = path.resolve(releaseDir, options.configDir || "config");
  const configuration = options.configuration;

  assertConfiguration(configuration);

  const projectPath = path.join(configDir, "project.json");
  const runtimePath = path.join(configDir, "runtime.json");
  const statePath = path.join(configDir, "install-state.json");
  const generatedAt = options.generatedAt || new Date().toISOString();

  const project = {
    generatedAt,
    version: PERSISTENT_CONFIGURATION_VERSION,
    ...configuration.config.project
  };
  const runtime = {
    generatedAt,
    version: PERSISTENT_CONFIGURATION_VERSION,
    ...configuration.config.runtime
  };
  const state = {
    generatedAt,
    installed: false,
    lockPath: path.join(configDir, "install.lock"),
    version: PERSISTENT_CONFIGURATION_VERSION
  };

  const files = [
    await writeJsonAtomic(projectPath, project),
    await writeJsonAtomic(runtimePath, runtime),
    await writeJsonAtomic(statePath, state)
  ];

  return {
    configDir,
    files,
    ok: true,
    projectPath,
    runtimePath,
    statePath,
    version: PERSISTENT_CONFIGURATION_VERSION
  };
}
