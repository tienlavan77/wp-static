export const PROVISIONING_CONFIG_VERSION = "1.0";
export const PROVISIONING_CONFIG_SCHEMA = "provisioning-config/v1";

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
    version: PROVISIONING_CONFIG_VERSION,
    createdAt,

    site: {
      id: options.site?.id || "",
      name: options.site?.name || ""
    },

    environment: clone(options.environment),

    source: clone(options.source),

    secrets: clone(options.secrets)
  };

  const validation = validateProvisioningConfig(config);

  if (!validation.ok) {
    return {
      ok: false,
      diagnostics: {
        errors: validation.errors,
        warnings: []
      },
      config
    };
  }

  return {
    ok: true,
    diagnostics: {
      errors: [],
      warnings: []
    },
    config
  };
}
