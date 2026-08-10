import path from "node:path";

const SCHEMA = "wpsc.release-operations";

export function validateReleaseOperationsConfiguration(value = {}, options = {}) {
  const schema = String(value.schema ?? "");
  const schemaVersion = Number(value.schemaVersion);
  if (schema !== SCHEMA || schemaVersion !== 1) throw coded("release_operations.configuration.invalid", "Release operations configuration schema is unsupported.");
  const channels = value.channels;
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) throw coded("release_operations.configuration.channels", "Release operations channels are required.");
  const normalized = {};
  for (const [name, channel] of Object.entries(channels)) normalized[name] = validateChannel(name, channel);
  const publicKeyPath = value.signing?.publicKeyPath;
  if (publicKeyPath !== undefined && !path.isAbsolute(String(publicKeyPath))) throw coded("release_operations.configuration.public_key", "The public-key path must be absolute.");
  if (options.retiredHarness && JSON.stringify(value).includes(path.resolve(options.retiredHarness))) throw coded("release_operations.configuration.retired_harness", "Retired production harness paths are forbidden.");
  return Object.freeze({ schema, schemaVersion, channels: Object.freeze(normalized), signing: Object.freeze({ publicKeyPath: publicKeyPath ? path.resolve(publicKeyPath) : null }) });
}

function validateChannel(name, value = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw coded("release_operations.configuration.channel", "Channel name is invalid.");
  let url;
  try { url = new URL(String(value.artifactBaseUrl ?? "")); } catch { throw coded("release_operations.configuration.url", `Channel ${name} artifact URL is invalid.`); }
  if (url.protocol !== "https:" || url.username || url.password) throw coded("release_operations.configuration.url", `Channel ${name} requires a credential-free HTTPS URL.`);
  const allowedHosts = Array.isArray(value.allowedHosts) ? value.allowedHosts.map(String) : [];
  if (!allowedHosts.includes(url.hostname)) throw coded("release_operations.configuration.host", `Channel ${name} host is not allow-listed.`);
  const publisher = value.publisher ?? {};
  if (publisher.root !== undefined && !path.isAbsolute(String(publisher.root))) throw coded("release_operations.configuration.publisher", `Channel ${name} publisher root must be absolute.`);
  return Object.freeze({ artifactBaseUrl: url.href, allowedHosts: Object.freeze(allowedHosts), publisher: Object.freeze({ root: publisher.root ? path.resolve(publisher.root) : null }) });
}

function coded(code, message) { const error = new Error(message); error.code = code; return error; }
