import deepFreeze from "../shared/deepFreeze.js";
import { assertSiteContext } from "../site/createSiteContext.js";

export const FORM_CONTRACT_SCHEMA = "wpsc.form";
export const FORM_CONTRACT_VERSION = 1;

// Definitions and delivery are provider concerns; this service owns the stable form lifecycle.
export default function createFormsService(options = {}) {
  const siteContext = options.siteContext ? assertSiteContext(options.siteContext) : null;
  const siteId = String(options.siteId ?? siteContext?.siteId ?? "").trim();
  const resolveForm = options.resolveForm;
  const submitForm = options.submitForm;
  if (!siteId) throw new TypeError("Forms Service requires a Site id.");

  async function read(formId) {
    const definition = await getDefinition(formId);
    return contract(definition, siteId, "idle");
  }

  async function validate(formId, values = {}) {
    const definition = await getDefinition(formId);
    const normalizedValues = normalizeValues(definition.fields, values);
    const errors = validateValues(definition.fields, normalizedValues);
    return contract(definition, siteId, errors.length ? "invalid" : "ready", { errors, values: normalizedValues });
  }

  async function submit(formId, values = {}, context = {}) {
    const validation = await validate(formId, values);
    if (validation.diagnostics.errors.length) return validation;
    if (typeof submitForm !== "function") {
      return withDiagnostics(validation, "error", [diagnostic("forms.provider.unavailable", "Form submission provider is not configured.")]);
    }

    try {
      const result = await submitForm({
        form: validation.form,
        siteContext: createSiteContext(context),
        siteId,
        values: validation.values
      });
      if (result?.ok === false || result?.error) {
        return withDiagnostics(validation, "error", [diagnostic("forms.provider.failed", result.error ?? "Form provider rejected the submission.")]);
      }
      return deepFreeze({ ...validation, response: result ?? { ok: true }, status: "submitted" });
    } catch (cause) {
      const code = cause.message === "Form submission Site mismatch." ? "forms.context.site_mismatch" : "forms.provider.failed";
      return withDiagnostics(validation, "error", [diagnostic(code, cause.message)]);
    }
  }

  async function getDefinition(formId) {
    const id = String(formId ?? "").trim();
    if (!id) throw new TypeError("Form id is required.");
    if (typeof resolveForm !== "function") throw new Error("Form definition provider is not configured.");
    const definition = await resolveForm({ formId: id, siteId });
    if (!definition || String(definition.id ?? id) !== id) throw new Error("Form definition was not found.");
    return normalizeDefinition({ ...definition, id });
  }

  function createSiteContext(context) {
    if (context.siteId && String(context.siteId) !== siteId) throw new Error("Form submission Site mismatch.");
    return deepFreeze({ siteId, sessionId: context.sessionId ?? null, userId: context.userId ?? null });
  }

  return Object.freeze({ read, siteId, submit, validate });
}

function normalizeDefinition(definition) {
  return deepFreeze({
    fields: Array.isArray(definition.fields) ? definition.fields.map((field) => ({
      id: String(field.id ?? field.name ?? "").trim(),
      label: String(field.label ?? field.id ?? "").trim(),
      required: field.required === true,
      type: String(field.type ?? "text").trim()
    })).filter((field) => field.id) : [],
    id: definition.id,
    name: String(definition.name ?? definition.id)
  });
}

function normalizeValues(fields, values) {
  return Object.fromEntries(fields.map((field) => [field.id, String(values[field.id] ?? "").trim()]));
}

function validateValues(fields, values) {
  return fields.flatMap((field) => {
    const value = values[field.id];
    if (field.required && !value) return [diagnostic("forms.field.required", `${field.label} is required.`, field.id)];
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return [diagnostic("forms.field.invalid", `${field.label} must be a valid email address.`, field.id)];
    return [];
  });
}

function contract(definition, siteId, status, options = {}) {
  return deepFreeze({
    diagnostics: { errors: options.errors ?? [], warnings: [] },
    form: definition,
    response: null,
    schema: FORM_CONTRACT_SCHEMA,
    schemaVersion: FORM_CONTRACT_VERSION,
    siteId,
    status,
    values: options.values ?? Object.fromEntries(definition.fields.map((field) => [field.id, ""]))
  });
}

function withDiagnostics(state, status, errors) {
  return deepFreeze({ ...state, diagnostics: { errors, warnings: [] }, status });
}

function diagnostic(code, message, field = undefined) {
  return { code, field, message, severity: "error" };
}
