import { randomUUID } from "node:crypto";

export const SITE_METADATA_VERSION = "1.0";

export const SITE_STATUSES = [
  "CREATED",
  "SETUP_REQUIRED",
  "REGISTERING_SOURCE",
  "READY",
  "BUILDING",
  "RUNNING",
  "ERROR",
  "DISABLED"
];

function normalizeStatus(status) {
  const value = String(status || "CREATED").trim().toUpperCase();
  return SITE_STATUSES.includes(value) ? value : "ERROR";
}

function createUuid(input) {
  if (input) {
    return String(input);
  }

  return randomUUID();
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
    uuid: createUuid(options.uuid)
  };
}
