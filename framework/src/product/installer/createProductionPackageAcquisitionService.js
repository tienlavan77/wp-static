import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

const markerName = ".wpsc-acquisition.json";

export default function createProductionPackageAcquisitionService(options = {}) {
  const allowedHosts = new Set(options.allowedHosts ?? []);
  const download = options.download;
  if (typeof download !== "function") throw new TypeError("Production Package Acquisition requires a download adapter.");

  async function acquire(input = {}) {
    const sourceUrl = trustedUrl(input.url, allowedHosts);
    const target = path.resolve(input.targetDir);
    const expected = identity(input);
    const existing = await readMarker(target);
    if (existing && sameIdentity(existing, expected)) return success({ changed: false, packageDir: target, preserved: true, ...expected });
    if (await exists(target)) return failure("installation.package.target_conflict", "Package acquisition target already exists with another identity.");
    const staging = `${target}.downloading-${input.installationId}`;
    await rm(staging, { force: true, recursive: true });
    try {
      const response = await download({ expectedSize: expected.size, idempotencyKey: input.idempotencyKey, url: sourceUrl.href });
      trustedUrl(response.url, allowedHosts);
      const bytes = Buffer.from(response.bytes);
      if (bytes.length !== expected.size) throw coded("installation.package.size_mismatch", "Downloaded package size does not match release metadata.");
      if (sha256(bytes) !== expected.sha256) throw coded("installation.package.checksum_mismatch", "Downloaded package checksum does not match release metadata.");
      const bundle = parseBundle(bytes, expected);
      await mkdir(staging, { recursive: true });
      for (const entry of bundle.entries) await materialize(staging, entry);
      await writeFile(path.join(staging, markerName), `${JSON.stringify({ ...expected, schema: "wpsc.package-acquisition", schemaVersion: 1, source: sourceUrl.href }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await rename(staging, target);
      return success({ changed: true, packageDir: target, preserved: false, ...expected });
    } catch (error) {
      await rm(staging, { force: true, recursive: true });
      return failure(error.code ?? "installation.package.download_failed", "Production package acquisition failed. Inspect redacted diagnostics.");
    }
  }
  return Object.freeze({ acquire });
}

function identity(input) {
  const productId = String(input.productId ?? "");
  const version = String(input.version ?? "");
  const size = Number(input.size);
  const checksum = String(input.sha256 ?? "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(productId) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new TypeError("Package acquisition identity is invalid.");
  if (!Number.isSafeInteger(size) || size <= 0 || !/^[a-f0-9]{64}$/.test(checksum)) throw new TypeError("Package acquisition size or SHA-256 is invalid.");
  return Object.freeze({ productId, sha256: checksum, size, version });
}
function trustedUrl(value, allowedHosts) { const url = new URL(value); if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password) throw coded("installation.package.source_untrusted", "Production package source is not trusted."); return url; }
function parseBundle(bytes, expected) {
  let bundle;
  try { bundle = JSON.parse(bytes.toString("utf8")); } catch { throw coded("installation.package.bundle_invalid", "Production package transport bundle is malformed."); }
  if (bundle.schema !== "wpsc.production-package-bundle" || bundle.schemaVersion !== 1 || bundle.productId !== expected.productId || bundle.version !== expected.version || !Array.isArray(bundle.entries)) throw coded("installation.package.identity_mismatch", "Production package transport identity does not match release metadata.");
  const seen = new Set();
  for (const entry of bundle.entries) { validateEntry(entry); if (seen.has(entry.path)) throw coded("installation.package.bundle_invalid", "Production package transport contains duplicate paths."); seen.add(entry.path); }
  if (!seen.has("production-package.json")) throw coded("installation.package.bundle_invalid", "Production package transport is missing its signed manifest.");
  return bundle;
}
function validateEntry(entry) {
  const relative = String(entry?.path ?? "");
  if (!relative || relative.startsWith("/") || relative.includes("\\") || relative.split("/").includes("..") || relative === markerName) throw coded("installation.package.path_unsafe", "Production package transport path is unsafe.");
  if (!['directory', 'file', 'symlink'].includes(entry.type)) throw coded("installation.package.type_unsafe", "Production package transport entry type is unsafe.");
  if (entry.type === "file" && typeof entry.content !== "string") throw coded("installation.package.bundle_invalid", "Production package file content is missing.");
  if (entry.type === "symlink") { const target = String(entry.target ?? ""); const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), target)); if (!target || target.startsWith("/") || resolved === ".." || resolved.startsWith("../")) throw coded("installation.package.path_unsafe", "Production package symlink escapes package root."); }
}
async function materialize(root, entry) { const target = path.join(root, entry.path); if (entry.type === "directory") await mkdir(target, { recursive: true }); else { await mkdir(path.dirname(target), { recursive: true }); if (entry.type === "file") await writeFile(target, Buffer.from(entry.content, "base64")); else await symlink(entry.target, target); } }
async function readMarker(target) { try { return JSON.parse(await readFile(path.join(target, markerName), "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function exists(target) { return stat(target).then(() => true, () => false); }
function sameIdentity(left, right) { return left.productId === right.productId && left.version === right.version && left.size === right.size && left.sha256 === right.sha256; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
function success(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
