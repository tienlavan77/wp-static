import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdateReleaseService(options = {}) {
  const source = options.source;
  const currentVersion = requiredVersion(options.currentVersion);
  if (!source || typeof source.list !== "function") throw new TypeError("Core Update Release Service requires a Package Source.");
  async function check() {
    try {
      const releases = normalize(await source.list());
      const available = releases.filter((release) => compare(release.version, currentVersion) > 0).sort((a, b) => compare(b.version, a.version))[0] ?? null;
      return success({ available, currentVersion, releases, status: available ? "UPDATE_AVAILABLE" : "UP_TO_DATE" });
    } catch (error) { return failure("core_update.release.unavailable", error.message, { currentVersion }); }
  }
  return Object.freeze({ check });
}

function normalize(releases) {
  if (!Array.isArray(releases)) throw new TypeError("Package source must return a release list.");
  return releases.map((release) => {
    if (!release || release.product !== "wpsc" || !release.packageId || !release.architecture || !release.runtime) throw new TypeError("Release metadata is invalid.");
    return deepFreeze({ architecture: String(release.architecture), packageId: String(release.packageId), product: "wpsc", runtime: String(release.runtime), version: requiredVersion(release.version) });
  });
}
function requiredVersion(value) { const version = String(value ?? ""); if (!/^\d+\.\d+\.\d+$/.test(version)) throw new TypeError("Release version must use x.y.z format."); return version; }
function compare(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message, data) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
