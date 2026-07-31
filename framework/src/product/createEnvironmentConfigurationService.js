import deepFreeze from "../shared/deepFreeze.js";

export const ENVIRONMENT_CONFIGURATION_SCHEMA = "wpsc.environment-configuration";
export const ENVIRONMENT_CONFIGURATION_VERSION = 1;
export const EnvironmentProfile = Object.freeze({ DEVELOPMENT: "development", PRODUCTION: "production" });

const PROFILE_DEFAULTS = Object.freeze({
  development: { runtime: { host: "127.0.0.1", logLevel: "debug", port: 8787 } },
  production: { runtime: { host: "0.0.0.0", logLevel: "info", port: 8787 } }
});

export default function createEnvironmentConfigurationService() {
  function create(input = {}) {
    const environment = input.environment ?? EnvironmentProfile.PRODUCTION;
    if (!Object.values(EnvironmentProfile).includes(environment)) throw new TypeError("Unsupported WPSC environment profile.");
    const config = {
      environment,
      runtime: { ...PROFILE_DEFAULTS[environment].runtime, ...definedEntries(input.runtime ?? {}) },
      schema: ENVIRONMENT_CONFIGURATION_SCHEMA,
      schemaVersion: ENVIRONMENT_CONFIGURATION_VERSION,
      secretReferences: normalizeReferences(input.secretReferences ?? {})
    };
    const validation = validate(config);
    if (!validation.ok) throw new TypeError(validation.errors.map((error) => error.message).join(" "));
    return deepFreeze(config);
  }

  function fromEnvironment(environment = process.env) {
    const secretReferences = {};
    const warnings = [];
    for (const [name, value] of Object.entries(environment)) {
      if (name.startsWith("WPSC_") && isSensitiveVariable(name) && !name.endsWith("_REF")) warnings.push({ code: "environment.secret.direct_ignored", message: `Direct secret environment value ignored: ${name}.`, severity: "warning" });
      if (name.startsWith("WPSC_") && name.endsWith("_REF") && value) secretReferences[name.slice(0, -4)] = { name: String(value), store: "environment" };
    }
    const config = create({
      environment: environment.WPSC_ENVIRONMENT ?? EnvironmentProfile.PRODUCTION,
      runtime: {
        host: environment.WPSC_RUNTIME_HOST,
        logLevel: environment.WPSC_LOG_LEVEL,
        port: environment.WPSC_RUNTIME_PORT ? Number(environment.WPSC_RUNTIME_PORT) : undefined
      },
      secretReferences
    });
    return deepFreeze({ config, diagnostics: { errors: [], warnings } });
  }

  function validate(config = {}) {
    const errors = [];
    if (config.schema !== ENVIRONMENT_CONFIGURATION_SCHEMA) errors.push(issue("environment.schema.invalid", "Environment configuration schema is invalid."));
    if (config.schemaVersion !== ENVIRONMENT_CONFIGURATION_VERSION) errors.push(issue("environment.schema_version.invalid", "Environment configuration schema version is invalid."));
    if (!Object.values(EnvironmentProfile).includes(config.environment)) errors.push(issue("environment.profile.invalid", "Environment profile is invalid."));
    if (typeof config.runtime?.host !== "string" || !config.runtime.host) errors.push(issue("environment.runtime.host.invalid", "Runtime host is required."));
    if (!Number.isInteger(config.runtime?.port) || config.runtime.port < 1 || config.runtime.port > 65535) errors.push(issue("environment.runtime.port.invalid", "Runtime port must be a valid TCP port."));
    if (!["debug", "info", "warn", "error"].includes(config.runtime?.logLevel)) errors.push(issue("environment.runtime.log_level.invalid", "Runtime log level is invalid."));
    for (const [key, reference] of Object.entries(config.secretReferences ?? {})) if (!isSensitiveVariable(key) || reference.store !== "environment" || !isEnvironmentVariableName(reference.name)) errors.push(issue("environment.secret_reference.invalid", `Secret Reference is invalid: ${key}.`, key));
    return { errors, ok: errors.length === 0 };
  }

  return Object.freeze({ create, fromEnvironment, validate });
}

function normalizeReferences(references) { return Object.fromEntries(Object.entries(references).map(([key, value]) => [key, typeof value === "string" ? { name: value, store: "environment" } : { ...value }])); }
function definedEntries(value) { return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)); }
function isEnvironmentVariableName(value) { return /^WPSC_[A-Z0-9_]+$/.test(String(value ?? "")); }
function isSensitiveVariable(name) { return /(PASSWORD|SECRET|TOKEN|CREDENTIAL|AUTHORIZATION|API_KEY|CONSUMER)/.test(name); }
function issue(code, message, field = null) { return { code, field, message, severity: "error" }; }
