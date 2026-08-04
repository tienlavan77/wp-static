import deepFreeze from "../../shared/deepFreeze.js";

export const NODE_DISTRIBUTION_SCHEMA = "wpsc.node-distributions";
export const NODE_DISTRIBUTION_SCHEMA_VERSION = 1;

export function createCertifiedNodeMatrix(input = {}) {
  const majors = [...new Set(input.majors ?? [])].filter((major) => Number.isInteger(major) && major > 0).sort((a, b) => a - b);
  if (majors.length === 0) throw new TypeError("At least one certified Node major is required.");
  return deepFreeze({ channel: "latest-certified", majors, schema: "wpsc.node-certified-majors", schemaVersion: 1 });
}

export function normalizeNodeDistributionMetadata(input = {}) {
  if (input.schema !== NODE_DISTRIBUTION_SCHEMA || input.schemaVersion !== NODE_DISTRIBUTION_SCHEMA_VERSION) throw new TypeError("Node distribution metadata schema is invalid.");
  const releases = (input.releases ?? []).map((release) => deepFreeze({
    files: Object.freeze(Object.fromEntries(Object.entries(release.files ?? {}).map(([platform, file]) => [platform, normalizeFile(file)]))),
    stable: release.stable === true,
    version: normalizeVersion(release.version)
  }));
  return deepFreeze({ releases, schema: NODE_DISTRIBUTION_SCHEMA, schemaVersion: NODE_DISTRIBUTION_SCHEMA_VERSION });
}

export function selectLatestCertifiedNode(input = {}) {
  const metadata = normalizeNodeDistributionMetadata(input.metadata);
  const matrix = createCertifiedNodeMatrix(input.matrix);
  const platform = `${input.platform}-${input.arch}`;
  const candidates = metadata.releases.filter((release) => release.stable && matrix.majors.includes(majorOf(release.version)) && release.files[platform]);
  candidates.sort((left, right) => compareVersions(right.version, left.version));
  if (!candidates[0]) throw new Error(`No certified stable Node distribution is available for ${platform}.`);
  return deepFreeze({ file: candidates[0].files[platform], platform, version: candidates[0].version });
}

export function assertTrustedDistributionUrl(value, allowedHosts = []) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) throw new TypeError(`Node distribution URL is not trusted: ${url.origin}.`);
  return url.href;
}

export function validateNodeArchiveEntries(entries = []) {
  for (const entry of entries) {
    const name = String(entry.path ?? "");
    if (!name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) throw new TypeError(`Unsafe Node archive path: ${name}.`);
    if (!["file", "directory", "symlink"].includes(entry.type)) throw new TypeError(`Unsafe Node archive entry type: ${entry.type}.`);
    if (entry.type === "symlink") {
      const target = String(entry.target ?? "");
      if (!target || target.startsWith("/") || target.includes("\\")) throw new TypeError(`Unsafe Node archive symlink target: ${target}.`);
      const resolved = new URL(target, `file:///${name}`).pathname;
      const packageRoot = `/${name.split("/")[0]}/`;
      if (!resolved.startsWith(packageRoot)) throw new TypeError(`Unsafe Node archive symlink target: ${target}.`);
    }
  }
  return true;
}

function normalizeFile(file = {}) {
  if (!/^[a-f0-9]{64}$/.test(String(file.sha256 ?? ""))) throw new TypeError("Node distribution SHA-256 is invalid.");
  return deepFreeze({ archiveType: String(file.archiveType ?? "tar.xz"), sha256: file.sha256, size: Number(file.size ?? 0), url: String(file.url ?? "") });
}
function normalizeVersion(value) { const version = String(value ?? "").replace(/^v/, ""); if (!/^\d+\.\d+\.\d+$/.test(version)) throw new TypeError(`Node version is invalid: ${value}.`); return version; }
function majorOf(version) { return Number(version.split(".")[0]); }
function compareVersions(left, right) { const a = left.split(".").map(Number); const b = right.split(".").map(Number); for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index]; return 0; }
