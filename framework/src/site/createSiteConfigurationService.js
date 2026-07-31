import deepFreeze from "../shared/deepFreeze.js";

export const SITE_SETTINGS_SCHEMA = "wpsc-site-settings";
export const SITE_SETTINGS_SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS = Object.freeze({
  environment: "production",
  features: {},
  general: { locale: "en", timezone: "UTC" },
  runtime: {},
  theme: {}
});

function diagnostic(code, message, field) {
  return { code, field, message, severity: "error" };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeSettings(base, input) {
  return {
    ...base,
    ...input,
    features: { ...base.features, ...(input.features || {}) },
    general: { ...base.general, ...(input.general || {}) },
    runtime: { ...base.runtime, ...(input.runtime || {}) },
    theme: { ...base.theme, ...(input.theme || {}) }
  };
}

export function validateSiteSettings(settings = {}) {
  const errors = [];
  if (!isRecord(settings)) return { errors: [diagnostic("site.settings.invalid", "Site settings must be an object.")], ok: false };
  if (settings.schema !== SITE_SETTINGS_SCHEMA) errors.push(diagnostic("site.settings.schema.invalid", `Site settings schema must be ${SITE_SETTINGS_SCHEMA}.`, "schema"));
  if (settings.schemaVersion !== SITE_SETTINGS_SCHEMA_VERSION) errors.push(diagnostic("site.settings.schema_version.invalid", "Unsupported Site settings schema version.", "schemaVersion"));
  if (typeof settings.siteId !== "string" || !settings.siteId.trim()) errors.push(diagnostic("site.settings.site_id.required", "Site settings require a Site id.", "siteId"));
  if (!isRecord(settings.general) || typeof settings.general.locale !== "string" || typeof settings.general.timezone !== "string") errors.push(diagnostic("site.settings.general.invalid", "General settings require locale and timezone.", "general"));
  if (!isRecord(settings.theme) || !isRecord(settings.features) || !isRecord(settings.runtime)) errors.push(diagnostic("site.settings.sections.invalid", "Theme, features, and runtime settings must be objects."));
  return { errors, ok: errors.length === 0 };
}

export default function createSiteConfigurationService(options = {}) {
  const repository = options.repository;
  if (!repository || typeof repository.readSettings !== "function" || typeof repository.writeSettings !== "function") throw new TypeError("Site Configuration Service requires a Site Repository.");

  function create(siteId, input = {}) {
    return deepFreeze({ ...mergeSettings(DEFAULT_SETTINGS, input), schema: SITE_SETTINGS_SCHEMA, schemaVersion: SITE_SETTINGS_SCHEMA_VERSION, siteId });
  }

  async function get(siteId) {
    try {
      const settings = deepFreeze(repository.readSettings ? await repository.readSettings(siteId) : null);
      const validation = validateSiteSettings(settings);
      return validation.ok ? { diagnostics: { errors: [], warnings: [] }, ok: true, settings } : { diagnostics: { errors: validation.errors, warnings: [] }, ok: false };
    } catch (error) {
      if (error.code !== "ENOENT") return { diagnostics: { errors: [diagnostic("site.settings.read.failed", error.message)], warnings: [] }, ok: false };
      return { diagnostics: { errors: [], warnings: [] }, ok: true, settings: create(siteId) };
    }
  }

  async function save(siteId, input = {}) {
    const current = await get(siteId);
    if (!current.ok) return current;
    const settings = create(siteId, mergeSettings(current.settings, input));
    const validation = validateSiteSettings(settings);
    if (!validation.ok) return { diagnostics: { errors: validation.errors, warnings: [] }, ok: false };
    const persisted = await repository.writeSettings(siteId, settings);
    return { diagnostics: { errors: [], warnings: [] }, ok: true, path: persisted.path, settings };
  }

  return Object.freeze({ create, get, save, validate: validateSiteSettings });
}
