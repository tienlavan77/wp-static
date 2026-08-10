import path from "node:path";
import createAtomicJsonStore from "./createAtomicJsonStore.js";

export default function createReleaseUpdateEvidenceStore(options = {}) {
  const workspace = path.resolve(options.workspace ?? process.cwd());
  const store = options.store ?? createAtomicJsonStore(path.join(workspace, "storage", "installer", "c049-self-update-evidence.json"), options.storeOptions);

  async function write(input = {}) {
    const document = evidence(input);
    await store.write(document);
    return document;
  }

  async function read() { return store.read(); }

  return Object.freeze({ path: store.path, read, write });
}

function evidence(input) {
  const release = input.release ?? {};
  const document = {
    after: { activeVersion: requiredVersion(input.targetVersion), protected: protectedHashes(input.after), runtimeVersion: requiredVersion(input.after?.runtimeVersion), wpscVersion: requiredVersion(input.after?.wpscVersion) },
    before: { activeVersion: requiredVersion(input.currentVersion), protected: protectedHashes(input.before) },
    completedAt: new Date().toISOString(),
    installationId: requiredId(input.installationId),
    previousReleasePresent: input.previousReleasePresent === true,
    probes: probes(input.probes),
    schema: "wpsc.c049-self-update",
    schemaVersion: 1,
    status: input.status === "PASS" ? "PASS" : "FAILED",
    target: { sha256: requiredDigest(release.sha256), size: requiredSize(release.size), version: requiredVersion(input.targetVersion) },
    transactionId: requiredId(input.transactionId),
    workspace: path.resolve(String(input.workspace ?? ""))
  };
  return Object.freeze(document);
}

function protectedHashes(value = {}) {
  const result = {};
  for (const key of ["credentials", "database", "publicOutput", "siteConfiguration"]) {
    const digest = String(value[key] ?? "");
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new TypeError(`C049 protected hash ${key} is invalid.`);
    result[key] = digest;
  }
  return Object.freeze(result);
}
function probes(value = {}) {
  const result = plainObject(value);
  for (const name of ["global-command", "nginx", "runtime", "systemd"]) {
    if (result[name]?.ok !== true) throw new TypeError(`C049 evidence probe ${name} must pass.`);
  }
  if (result.health?.state !== "HEALTHY") throw new TypeError("C049 evidence health must be HEALTHY.");
  return result;
}
function plainObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : {}; }
function requiredId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id)) throw new TypeError("C049 evidence identifier is invalid."); return id; }
function requiredVersion(value) { const version = String(value ?? ""); if (!/^\d+\.\d+\.\d+$/.test(version)) throw new TypeError("C049 evidence version is invalid."); return version; }
function requiredDigest(value) { const digest = String(value ?? ""); if (!/^[a-f0-9]{64}$/.test(digest)) throw new TypeError("C049 evidence package digest is invalid."); return digest; }
function requiredSize(value) { const size = Number(value); if (!Number.isSafeInteger(size) || size <= 0) throw new TypeError("C049 evidence package size is invalid."); return size; }
