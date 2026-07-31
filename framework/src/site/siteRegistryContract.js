import deepFreeze from "../shared/deepFreeze.js";

export const SITE_REGISTRY_SCHEMA = "wpsc.site-registry";
export const SITE_REGISTRY_VERSION = 1;

export const SiteOperationalStatus = Object.freeze({
  ACTIVE: "active",
  DEACTIVATED: "deactivated",
  DELETED: "deleted",
  SUSPENDED: "suspended"
});

export const SITE_OPERATIONAL_STATUSES = Object.freeze(Object.values(SiteOperationalStatus));

export function createEmptySiteRegistry(now = new Date().toISOString()) {
  return deepFreeze({
    createdAt: now,
    schema: SITE_REGISTRY_SCHEMA,
    schemaVersion: SITE_REGISTRY_VERSION,
    sites: [],
    updatedAt: now
  });
}

export function validateSiteRegistry(registry = {}) {
  const errors = [];
  if (registry.schema !== SITE_REGISTRY_SCHEMA) errors.push(error("site.registry.schema.invalid", "Unsupported Site Registry schema."));
  if (registry.schemaVersion !== SITE_REGISTRY_VERSION) errors.push(error("site.registry.version.invalid", "Unsupported Site Registry version."));
  if (!Array.isArray(registry.sites)) errors.push(error("site.registry.sites.invalid", "Site Registry sites must be an array."));

  const seenSiteIds = new Set();
  const seenDomains = new Set();
  for (const record of registry.sites ?? []) {
    if (!isSiteId(record.siteId)) errors.push(error("site.registry.site_id.invalid", "Registry record has an invalid Site id."));
    if (seenSiteIds.has(record.siteId)) errors.push(error("site.registry.site_id.duplicate", `Site is registered more than once: ${record.siteId}.`));
    seenSiteIds.add(record.siteId);
    if (!SITE_OPERATIONAL_STATUSES.includes(record.status)) errors.push(error("site.registry.status.invalid", `Invalid operational status for Site: ${record.siteId}.`));
    if (typeof record.uuid !== "string" || !record.uuid.trim()) errors.push(error("site.registry.uuid.required", `Registry record requires UUID: ${record.siteId}.`));
    if (!Array.isArray(record.domains)) errors.push(error("site.registry.domains.invalid", `Registry domains must be an array: ${record.siteId}.`));
    for (const domain of record.domains ?? []) {
      if (!isDomain(domain)) errors.push(error("site.registry.domain.invalid", `Invalid Site domain: ${domain}.`));
      if (seenDomains.has(domain)) errors.push(error("site.registry.domain.duplicate", `Domain is assigned more than once: ${domain}.`));
      seenDomains.add(domain);
    }
  }
  return { errors, ok: errors.length === 0 };
}

export function normalizeDomain(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.pathname === "/" && !url.search && !url.hash ? url.host : null;
  } catch {
    return null;
  }
}

function error(code, message) {
  return { code, message, severity: "error" };
}

function isDomain(value) {
  return normalizeDomain(value) === value;
}

function isSiteId(value) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(String(value ?? ""));
}
