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

  if (config.adapter.type === "mock") {
    requireString(config.adapter, "adapter.source");
  }

  if (config.adapter.type === "wordpress") {
    requireString(config.adapter, "adapter.baseUrl");
  }

  return config;
}

function requireString(object, fieldPath) {
  const fieldName = fieldPath.split(".").at(-1);
  const value = object?.[fieldName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`Config field "${fieldPath}" is required.`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
