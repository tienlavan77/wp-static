import { randomUUID } from "node:crypto";

export const SITE_UUID_VERSION = "1.0";

export function isSiteUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

export default function createSiteUuid(options = {}) {
  const uuid = options.uuid ? String(options.uuid) : randomUUID();

  if (!isSiteUuid(uuid)) {
    throw new Error(`Invalid site uuid: ${uuid}`);
  }

  return uuid;
}
