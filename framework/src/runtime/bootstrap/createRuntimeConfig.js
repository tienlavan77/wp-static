import path from "node:path";

export const RUNTIME_CONFIG_VERSION = "1.0";

const VALID_MODES = new Set(["development", "production", "test"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMode(mode) {
  return mode || process.env.WPSC_RUNTIME_MODE || process.env.NODE_ENV || "development";
}

function resolvePath(projectDir, value, fallback) {
  const target = value || fallback;
  return path.isAbsolute(target) ? target : path.resolve(projectDir, target);
}

function normalizeExtensions(extensions, diagnostics) {
  if (extensions === undefined) {
    return [];
  }

  if (!Array.isArray(extensions)) {
    diagnostics.errors.push({
      code: "runtime.config.extensions.invalid",
      message: "Runtime extensions must be an array."
    });
    return [];
  }

  return extensions.map((extension, index) => {
    if (typeof extension === "function") {
      return {
        enabled: true,
        plugin: extension,
        source: extension.name || `extension-${index}`
      };
    }

    if (!isPlainObject(extension)) {
      diagnostics.errors.push({
        code: "runtime.config.extension.invalid",
        message: `Runtime extension at index ${index} must be an object or function.`
      });
      return {
        enabled: false,
        plugin: null,
        source: `extension-${index}`
      };
    }

    const plugin = extension.plugin || extension;
    const source = extension.source || plugin?.name || `extension-${index}`;

    if (!plugin || (typeof plugin !== "object" && typeof plugin !== "function")) {
      diagnostics.errors.push({
        code: "runtime.config.extension.plugin.invalid",
        message: `Runtime extension "${source}" must provide a plugin object or setup function.`
      });
    }

    return {
      enabled: extension.enabled !== false,
      options: extension.options || {},
      plugin,
      source
    };
  });
}

function normalizeServices(services, diagnostics) {
  if (services === undefined) {
    return {};
  }

  if (!isPlainObject(services)) {
    diagnostics.errors.push({
      code: "runtime.config.services.invalid",
      message: "Runtime services must be an object keyed by service name."
    });
    return {};
  }

  return services;
}

export function validateRuntimeConfig(config) {
  const diagnostics = {
    errors: [],
    warnings: []
  };

  if (!isPlainObject(config)) {
    diagnostics.errors.push({
      code: "runtime.config.invalid",
      message: "Runtime configuration must be an object."
    });
    return diagnostics;
  }

  if (!VALID_MODES.has(config.mode)) {
    diagnostics.errors.push({
      code: "runtime.config.mode.invalid",
      message: `Runtime mode "${config.mode}" is not supported.`
    });
  }

  const extensionNames = new Set();
  for (const extension of config.extensions || []) {
    if (!extension.enabled) {
      continue;
    }

    if (extensionNames.has(extension.source)) {
      diagnostics.errors.push({
        code: "runtime.config.extension.duplicate",
        message: `Runtime extension "${extension.source}" is defined more than once.`
      });
    }

    extensionNames.add(extension.source);
  }

  return diagnostics;
}

export default function createRuntimeConfig(input = {}) {
  const diagnostics = {
    errors: [],
    warnings: []
  };

  if (!isPlainObject(input)) {
    return {
      diagnostics: {
        errors: [
          {
            code: "runtime.config.invalid",
            message: "Runtime configuration must be an object."
          }
        ],
        warnings: []
      },
      ok: false,
      version: RUNTIME_CONFIG_VERSION
    };
  }

  const mode = normalizeMode(input.mode);
  const projectDir = path.resolve(input.projectDir || process.cwd());
  const config = {
    cache: input.cache || {},
    extensions: normalizeExtensions(input.extensions, diagnostics),
    mode,
    paths: {
      cacheDir: resolvePath(projectDir, input.cacheDir || input.paths?.cacheDir, ".wpsc/cache"),
      outputDir: resolvePath(projectDir, input.outputDir || input.paths?.outputDir, "dist"),
      projectDir,
      runtimeConfigPath: resolvePath(
        projectDir,
        input.runtimeConfigPath || input.paths?.runtimeConfigPath,
        "runtime.config.js"
      )
    },
    services: normalizeServices(input.services, diagnostics),
    version: RUNTIME_CONFIG_VERSION
  };

  const validation = validateRuntimeConfig(config);
  diagnostics.errors.push(...validation.errors);
  diagnostics.warnings.push(...validation.warnings);

  return {
    config,
    diagnostics,
    ok: diagnostics.errors.length === 0,
    version: RUNTIME_CONFIG_VERSION
  };
}
