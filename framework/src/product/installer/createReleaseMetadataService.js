import { readlink } from "node:fs/promises";
import path from "node:path";

export default function createReleaseMetadataService(options = {}) {
  const workspace = path.resolve(options.workspace ?? process.cwd());
  const source = options.source;
  const allowedHosts = new Set(options.allowedHosts ?? []);
  const nodeMajor = Number(options.nodeMajor);
  if (!source || typeof source.list !== "function") throw new TypeError("Release metadata requires a trusted source.");

  async function check(input = {}) {
    try {
      const currentVersion = await current();
      const releases = normalize(await source.list(), allowedHosts, nodeMajor, input.productId ?? "wpsc");
      const newer = releases.filter((release) => compare(release.version, currentVersion) > 0);
      const available = newer.filter((release) => release.compatible).sort((left, right) => compare(right.version, left.version))[0] ?? null;
      const status = available ? "UPDATE_AVAILABLE" : newer.length ? "INCOMPATIBLE" : "UP_TO_DATE";
      return success({ available, currentVersion, installationId: input.installationId, releases, status, updateAvailable: Boolean(available) });
    } catch (error) { return failure(error.code ?? "release_update.metadata.invalid", error.message); }
  }

  async function current() {
    const pointer = await readlink(path.join(workspace, "core", "active"));
    const match = /^releases\/(\d+\.\d+\.\d+)$/.exec(pointer);
    if (!match) throw coded("release_update.current.invalid", "Installation active Core does not identify a valid release.");
    return match[1];
  }

  return Object.freeze({ check, current });
}

function normalize(values, allowedHosts, nodeMajor, productId) {
  if (!Array.isArray(values)) throw coded("release_update.metadata.invalid", "Release metadata source must return an array.");
  return values.map((value) => {
    const url = new URL(String(value?.url ?? ""));
    const version = String(value?.version ?? "");
    const size = Number(value?.size);
    const sha256 = String(value?.sha256 ?? "").toLowerCase();
    const minNodeMajor = Number(value?.minNodeMajor);
    if (url.protocol !== "https:" || url.username || url.password || !allowedHosts.has(url.hostname)) throw coded("release_update.metadata.source_untrusted", "Release URL is not a trusted HTTPS source.");
    if (value?.productId !== productId || !/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(size) || size <= 0 || !/^[a-f0-9]{64}$/.test(sha256)) throw coded("release_update.metadata.invalid", "Release metadata is invalid.");
    if (!Number.isSafeInteger(minNodeMajor) || minNodeMajor < 1) throw coded("release_update.metadata.invalid", "Release Node compatibility metadata is invalid.");
    return Object.freeze({ compatible: !Number.isSafeInteger(nodeMajor) || minNodeMajor <= nodeMajor, minNodeMajor, productId, sha256, size, url: url.href, version });
  });
}

function compare(left, right) { const a = left.split(".").map(Number); const b = right.split(".").map(Number); for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index]; return 0; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
function success(data) { return Object.freeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
