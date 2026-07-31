import deepFreeze from "../shared/deepFreeze.js";

export const PRODUCT_MANIFEST_SCHEMA = "wpsc.product";
export const PRODUCT_MANIFEST_SCHEMA_VERSION = 1;
export const WPSC_PRODUCT_ID = "wpsc";
export const WPSC_ARCHITECTURE_VERSION = "2.02";
export const WPSC_RUNTIME_VERSION = "1.0";

export default function createProductManifest(options = {}) {
  const compatibility = {
    architectureVersion: options.architectureVersion ?? WPSC_ARCHITECTURE_VERSION,
    minimumNodeVersion: options.minimumNodeVersion ?? "20.0.0",
    runtimeVersion: options.runtimeVersion ?? WPSC_RUNTIME_VERSION,
    schemas: { product: PRODUCT_MANIFEST_SCHEMA_VERSION, ...(options.schemas ?? {}) }
  };
  const manifest = {
    architectureVersion: compatibility.architectureVersion,
    compatibility,
    productId: options.productId ?? WPSC_PRODUCT_ID,
    runtimeVersion: compatibility.runtimeVersion,
    schema: PRODUCT_MANIFEST_SCHEMA,
    schemaVersion: PRODUCT_MANIFEST_SCHEMA_VERSION,
    version: options.version ?? "1.0.0"
  };
  const validation = validateProductManifest(manifest);
  if (!validation.ok) throw new TypeError(validation.errors.map((error) => error.message).join(" "));
  return deepFreeze(manifest);
}

export function validateProductManifest(manifest = {}) {
  const errors = [];
  if (manifest.schema !== PRODUCT_MANIFEST_SCHEMA) errors.push(issue("product.manifest.schema.invalid", "Product manifest schema is invalid."));
  if (manifest.schemaVersion !== PRODUCT_MANIFEST_SCHEMA_VERSION) errors.push(issue("product.manifest.schema_version.invalid", "Product manifest schema version is invalid."));
  if (manifest.productId !== WPSC_PRODUCT_ID) errors.push(issue("product.manifest.product_id.invalid", "Product manifest productId must be wpsc."));
  for (const field of ["version", "architectureVersion", "runtimeVersion"]) if (!isVersion(manifest[field])) errors.push(issue("product.manifest.version.invalid", `Product manifest ${field} must be a semantic version.`, field));
  if (!isVersion(manifest.compatibility?.minimumNodeVersion)) errors.push(issue("product.manifest.node_version.invalid", "Product manifest minimum Node version must be a semantic version."));
  if (manifest.compatibility?.architectureVersion !== manifest.architectureVersion || manifest.compatibility?.runtimeVersion !== manifest.runtimeVersion) errors.push(issue("product.manifest.compatibility.invalid", "Product compatibility must match Architecture and Runtime versions."));
  return { errors, ok: errors.length === 0 };
}

export function validateProductCompatibility(manifest, runtime = {}) {
  const validation = validateProductManifest(manifest);
  if (!validation.ok) return validation;
  const errors = [];
  if (runtime.architectureVersion && runtime.architectureVersion !== manifest.architectureVersion) errors.push(issue("product.compatibility.architecture.mismatch", "Runtime Architecture version is incompatible."));
  if (runtime.runtimeVersion && runtime.runtimeVersion !== manifest.runtimeVersion) errors.push(issue("product.compatibility.runtime.mismatch", "Runtime version is incompatible."));
  if (runtime.nodeVersion && compareVersions(runtime.nodeVersion, manifest.compatibility.minimumNodeVersion) < 0) errors.push(issue("product.compatibility.node.unsupported", "Node runtime does not meet the minimum supported version."));
  for (const [name, version] of Object.entries(manifest.compatibility.schemas ?? {})) if (runtime.schemas?.[name] !== undefined && runtime.schemas[name] !== version) errors.push(issue("product.compatibility.schema.mismatch", `Schema version is incompatible: ${name}.`, name));
  return { errors, ok: errors.length === 0 };
}

function compareVersions(left, right) { const a = parseVersion(left); const b = parseVersion(right); for (let index = 0; index < 3; index += 1) { if (a[index] !== b[index]) return a[index] - b[index]; } return 0; }
function parseVersion(value) { const match = String(value ?? "").replace(/^v/, "").match(/^(\d+)\.(\d+)(?:\.(\d+))?$/); return match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)] : [0, 0, 0]; }
function isVersion(value) { return /^\d+\.\d+(?:\.\d+)?$/.test(String(value ?? "")); }
function issue(code, message, field = null) { return { code, field, message, severity: "error" }; }
