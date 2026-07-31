import deepFreeze from "../shared/deepFreeze.js";

export const SITE_CONTEXT_SCHEMA = "wpsc.site-context";
export const SITE_CONTEXT_VERSION = 1;

export default function createSiteContext(input = {}) {
  const siteId = normalizeSiteId(input.siteId);
  const identity = {
    domain: input.domain ?? null,
    schema: SITE_CONTEXT_SCHEMA,
    schemaVersion: SITE_CONTEXT_VERSION,
    siteId,
    workspaceId: input.workspaceId ?? null
  };

  return deepFreeze({
    ...identity,
    assertSite(candidateSiteId) {
      const candidate = normalizeSiteId(candidateSiteId);
      if (candidate !== siteId) {
        throw new Error(`Site context mismatch: expected "${siteId}", received "${candidate}".`);
      }
      return siteId;
    }
  });
}

export function assertSiteContext(context) {
  if (!context || context.schema !== SITE_CONTEXT_SCHEMA || context.schemaVersion !== SITE_CONTEXT_VERSION || typeof context.siteId !== "string" || !context.siteId) {
    throw new TypeError("A valid Site Context is required.");
  }
  return context;
}

function normalizeSiteId(siteId) {
  const value = String(siteId ?? "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) {
    throw new TypeError(`Invalid Site id: ${siteId}`);
  }
  return value;
}
