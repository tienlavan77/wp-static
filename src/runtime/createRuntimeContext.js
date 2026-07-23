import path from "node:path";
import createLogger from "../shared/createLogger.js";

export const RUNTIME_CONTEXT_VERSION = "1.0";

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function resolveFrom(baseDir, value, fallback) {
  const target = value || fallback;
  return path.isAbsolute(target) ? target : path.resolve(baseDir, target);
}

export function createRuntimeEnvironment(options = {}) {
  const variables = {
    ...process.env,
    ...(options.variables || {})
  };
  const mode =
    options.mode ||
    variables.WPSC_RUNTIME_MODE ||
    variables.NODE_ENV ||
    "development";

  return {
    ci: toBoolean(options.ci ?? variables.CI),
    isDevelopment: mode !== "production",
    isProduction: mode === "production",
    mode,
    nodeEnv: variables.NODE_ENV || mode,
    variables
  };
}

export function createRuntimePaths(options = {}) {
  const configPaths = options.config?._paths || {};
  const projectDir = path.resolve(
    options.projectDir || configPaths.projectDir || process.cwd()
  );
  const outputDir = resolveFrom(
    projectDir,
    options.outputDir || configPaths.outputDir || options.config?.outputDir,
    "dist"
  );
  const cacheDir = resolveFrom(
    projectDir,
    options.cacheDir || configPaths.cacheDir,
    ".wpsc/cache"
  );

  return {
    cacheDir,
    configPath: resolveFrom(
      projectDir,
      options.configPath || configPaths.configPath,
      "wpsc.config.js"
    ),
    outputDir,
    projectDir,
    runtimeConfigPath: resolveFrom(
      projectDir,
      options.runtimeConfigPath || configPaths.runtimeConfigPath,
      "runtime.config.js"
    )
  };
}

export default function createRuntimeContext(options = {}) {
  const paths = createRuntimePaths(options);
  const environment = createRuntimeEnvironment(options.environment);
  const logger =
    options.logger ||
    createLogger({
      quiet: options.quiet,
      verbose: options.verbose
    });

  return {
    cache: options.cache || {},
    config: options.config || {},
    diagnostics: {
      errors: [],
      warnings: []
    },
    environment,
    logger,
    paths,
    request: options.request || null,
    services: options.services || {},
    version: RUNTIME_CONTEXT_VERSION
  };
}
