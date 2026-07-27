import deepFreeze from "../shared/deepFreeze.js";

export const PROVISIONING_CONFIG_SCHEMA = "provisioning-config";
export const PROVISIONING_CONFIG_SCHEMA_VERSION = 1;

function clone(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value);
}

export function validateProvisioningConfig(config = {}) {
  const errors = [];

  if (config.schema !== PROVISIONING_CONFIG_SCHEMA) {
    errors.push({
      code: "provision.config.schema.invalid",
      field: "schema",
      message: "Provisioning config schema is invalid."
    });
  }

  if (config.schemaVersion !== PROVISIONING_CONFIG_SCHEMA_VERSION) {
    errors.push({
      code: "provision.config.schema_version.invalid",
      field: "schemaVersion",
      message: "Provisioning config schema version is invalid."
    });
  }

  if (config.frameworkVersion !== null && typeof config.frameworkVersion !== "string") {
    errors.push({
      code: "provision.config.framework_version.invalid",
      field: "frameworkVersion",
      message: "Framework version must be a string or null."
    });
  }

  if (!isObject(config.site)) {
    errors.push({
      code: "provision.config.site.invalid",
      field: "site",
      message: "Site configuration is required."
    });
  } else {
    if (
      typeof config.site.id !== "string"
      || config.site.id.trim() === ""
    ) {
      errors.push({
        code: "provision.config.site.id.required",
        field: "site.id",
        message: "Site id is required."
      });
    }

    if (
      typeof config.site.name !== "string"
      || config.site.name.trim() === ""
    ) {
      errors.push({
        code: "provision.config.site.name.required",
        field: "site.name",
        message: "Site name is required."
      });
    }
  }

  if (!isObject(config.environment)) {
    errors.push({
      code: "provision.config.environment.invalid",
      field: "environment",
      message: "Environment configuration is required."
    });
  }

  if (!isObject(config.source)) {
    errors.push({
      code: "provision.config.source.invalid",
      field: "source",
      message: "Source configuration is required."
    });
  }

  if (!isObject(config.secrets)) {
    errors.push({
      code: "provision.config.secrets.invalid",
      field: "secrets",
      message: "Provisioning secrets are required."
    });
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export default function createProvisioningConfig(options = {}) {
  const createdAt =
    options.createdAt
    || new Date().toISOString();

  const config = {
    schema: PROVISIONING_CONFIG_SCHEMA,
    schemaVersion: PROVISIONING_CONFIG_SCHEMA_VERSION,
    frameworkVersion: options.frameworkVersion || null,
    createdAt,

    site: {
      id: options.site?.id || "",
      name: options.site?.name || ""
    },

    environment: clone(options.environment),

    source: clone(options.source),

    secrets: clone(options.secrets)
  };

  const immutableConfig = deepFreeze(config);
  const validation = validateProvisioningConfig(immutableConfig);

  if (!validation.ok) {
    return {
      ok: false,
      diagnostics: {
        errors: validation.errors,
        warnings: []
      },
      config: immutableConfig
    };
  }

  return {
    ok: true,
    diagnostics: {
      errors: [],
      warnings: []
    },
    config: immutableConfig
  };
}
