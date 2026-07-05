import { ConfigError } from "../shared/errors.js";

export default function validateConfig(config) {
  if (!isPlainObject(config)) {
    throw new ConfigError("Config must export a plain object.");
  }

  requireString(config, "name");
  requireString(config, "homepage");
  requireString(config, "outputDir");
  requireString(config.adapter, "adapter.type");
  requireString(config.theme, "theme.layout");
  requireOptionalString(config.theme, "theme.assets");
  requireOptionalString(config.theme, "theme.blocks");
  requireOptionalString(config.theme, "theme.components");
  requireOptionalString(config.project, "project.blocks");
  requireOptionalPluginArray(config.plugins);

  if (config.adapter.type === "mock") {
    requireString(config.adapter, "adapter.source");
  }

  if (config.adapter.type === "wordpress") {
    requireString(config.adapter, "adapter.baseUrl");
  }

  if (config.adapter.type === "woocommerce") {
    requireString(config.adapter, "adapter.baseUrl");
  }

  return config;
}

function requireOptionalPluginArray(plugins) {
  if (plugins === undefined) {
    return;
  }

  if (!Array.isArray(plugins)) {
    throw new ConfigError('Config field "plugins" must be an array when provided.');
  }

  for (const plugin of plugins) {
    if (typeof plugin === "string") {
      continue;
    }

    if (!isPlainObject(plugin) || typeof plugin.path !== "string" || plugin.path.trim() === "") {
      throw new ConfigError('Each plugin must be a path string or an object with a non-empty "path".');
    }
  }
}

function requireString(object, fieldPath) {
  const fieldName = fieldPath.split(".").at(-1);
  const value = object?.[fieldName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`Config field "${fieldPath}" is required.`);
  }
}

function requireOptionalString(object, fieldPath) {
  const fieldName = fieldPath.split(".").at(-1);
  const value = object?.[fieldName];

  if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
    throw new ConfigError(`Config field "${fieldPath}" must be a non-empty string when provided.`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
