import createSiteUuid from "./createSiteUuid.js";

export const SITE_METADATA_VERSION = "1.0";

export const SiteState = Object.freeze({
  CREATED: "CREATED",
  SETUP_REQUIRED: "SETUP_REQUIRED",
  READY_FOR_FIRST_BUILD: "READY_FOR_FIRST_BUILD",
  BUILDING: "BUILDING",
  RUNNING: "RUNNING",
  ERROR: "ERROR",
  MAINTENANCE: "MAINTENANCE"
});

export const SITE_STATUSES = Object.freeze(Object.values(SiteState));

export const SITE_METADATA_REQUIRED_FIELDS = Object.freeze([
  "uuid",
  "name",
  "status",
  "framework_version",
  "created_at",
  "updated_at"
]);

function normalizeStatus(status) {
  const value = String(status || SiteState.CREATED).trim().toUpperCase();
  return SITE_STATUSES.includes(value) ? value : SiteState.ERROR;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function validateSiteMetadata(metadata = {}) {
  const errors = [];

  for (const field of SITE_METADATA_REQUIRED_FIELDS) {
    if (!isNonEmptyString(metadata[field])) {
      errors.push({
        code: "site.metadata.field.required",
        field,
        message: `Site metadata field is required: ${field}`
      });
    }
  }

  try {
    createSiteUuid({
      uuid: metadata.uuid
    });
  } catch {
    errors.push({
      code: "site.metadata.uuid.invalid",
      field: "uuid",
      message: "Site metadata uuid must be a UUID v4."
    });
  }

  if (!SITE_STATUSES.includes(metadata.status)) {
    errors.push({
      code: "site.metadata.status.invalid",
      field: "status",
      message: "Site metadata status must be a known SiteState value."
    });
  }

  return {
    errors,
    ok: errors.length === 0
  };
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
