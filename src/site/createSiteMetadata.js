import createSiteUuid from "./createSiteUuid.js";

export const SITE_METADATA_VERSION = "1.0";

export const SiteState = Object.freeze({
  CREATED: "CREATED",
  SETUP_REQUIRED: "SETUP_REQUIRED",
  READY: "READY",
  BUILDING: "BUILDING",
  RUNNING: "RUNNING",
  ERROR: "ERROR",
  DISABLED: "DISABLED",
  REGISTERING_SOURCE: "REGISTERING_SOURCE"
});

export const SITE_STATUSES = Object.freeze(Object.values(SiteState));

function normalizeStatus(status) {
  const value = String(status || SiteState.CREATED).trim().toUpperCase();
  return SITE_STATUSES.includes(value) ? value : SiteState.ERROR;
}

export default function createSiteMetadata(options = {}) {
  const now = options.now || new Date().toISOString();
  const name = String(options.name || "site").trim();

  return {
    created_at: options.createdAt || now,
    framework_version: options.frameworkVersion || "1.0.0",
    metadata_version: SITE_METADATA_VERSION,
    name,
    status: normalizeStatus(options.status),
    updated_at: options.updatedAt || now,
    uuid: createSiteUuid({
      uuid: options.uuid
    })
  };
}
