import deepFreeze from "../shared/deepFreeze.js";

export const SECRETS_BOUNDARY_SCHEMA = "wpsc.secrets-boundary";
export const SECRETS_BOUNDARY_VERSION = 1;
export const SECRET_REFERENCE_SCHEMA = "wpsc.secret-reference";
export const SECRET_REFERENCE_VERSION = 1;

export default function createSecretsBoundaryService(options = {}) {
  const credentialStore = options.credentialStore;
  if (!credentialStore?.read) throw new TypeError("Secrets Boundary Service requires a credential store.");

  function createReference(siteId, name) {
    const safeSiteId = requireSiteId(siteId);
    const safeName = requireSecretName(name);
    return deepFreeze({ name: safeName, schema: SECRET_REFERENCE_SCHEMA, schemaVersion: SECRET_REFERENCE_VERSION, siteId: safeSiteId, store: "site-credentials" });
  }

  async function withSecret(siteId, reference, consumer) {
    const safeSiteId = requireSiteId(siteId);
    assertReference(reference, safeSiteId);
    if (typeof consumer !== "function") throw new TypeError("Secret consumer must be a function.");
    const credentials = await credentialStore.read(safeSiteId);
    const value = credentials[reference.name];
    if (typeof value !== "string" || !value) throw new Error(`Secret is unavailable: ${reference.name}.`);
    // The value exists only in this provider-client callback, never in public contracts.
    return consumer(value);
  }

  function publicProjection(value) {
    return deepFreeze(redactSensitiveData(value));
  }

  function assertSafePublicContract(value, boundary = "public contract") {
    const forbidden = findSensitivePath(value);
    if (forbidden) throw new TypeError(`${boundary} cannot contain secret field: ${forbidden}.`);
    return deepFreeze(value);
  }

  return Object.freeze({ assertSafePublicContract, createReference, publicProjection, withSecret });
}

export function isSensitiveKey(key) {
  return /(password|secret|token|credential|authorization|api.?key|consumer)/i.test(String(key));
}

function assertReference(reference, siteId) {
  if (!reference || reference.schema !== SECRET_REFERENCE_SCHEMA || reference.schemaVersion !== SECRET_REFERENCE_VERSION) throw new TypeError("A valid Secret Reference is required.");
  if (reference.siteId !== siteId) throw new Error("Secret Reference cannot cross Site boundaries.");
  requireSecretName(reference.name);
}
function requireSiteId(siteId) { const value = String(siteId ?? "").trim(); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) throw new TypeError("A valid Site id is required."); return value; }
function requireSecretName(name) { const value = String(name ?? "").trim(); if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value) || !isSensitiveKey(value)) throw new TypeError("A Secret Reference requires a sensitive credential field name."); return value; }
export function redactSensitiveData(value, key = "") { if (isSensitiveKey(key)) return "[REDACTED]"; if (Array.isArray(value)) return value.map((entry) => redactSensitiveData(entry)); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactSensitiveData(entryValue, entryKey)])); return value; }
function findSensitivePath(value, path = "") { if (Array.isArray(value)) return value.map((entry, index) => findSensitivePath(entry, `${path}[${index}]`)).find(Boolean) ?? null; if (!value || typeof value !== "object") return null; for (const [key, entry] of Object.entries(value)) { const current = path ? `${path}.${key}` : key; if (isSensitiveKey(key)) return current; const nested = findSensitivePath(entry, current); if (nested) return nested; } return null; }
