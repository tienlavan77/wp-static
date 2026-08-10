import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

export default function createReleaseArtifactPublisher(options = {}) {
  const root = path.resolve(String(options.root ?? ""));
  if (!root || root === path.parse(root).root) throw new TypeError("Publication root is required.");
  const fs = options.fs ?? { mkdir, readFile, rename, rm, stat };
  const hash = options.hash ?? hashFile;
  const lockRetries = options.lockRetries ?? 200;
  const lockRetryMs = options.lockRetryMs ?? 5;

  async function publish(input = {}) {
    if (input.dryRun === true) return result(input, "DRY_RUN", false);
    if (input.verified?.accepted !== true) return failure("VERIFICATION_REQUIRED", "C041 verification acceptance is required before publication.");
    const release = validateRelease(input.release);
    const artifact = path.resolve(String(input.artifact ?? ""));
    const actual = await fs.stat(artifact);
    const digest = await hash(artifact);
    if (actual.size !== release.size || digest !== release.sha256) return failure("ARTIFACT_IDENTITY_INVALID", "Artifact identity does not match validated release metadata.");
    const destination = path.join(root, release.version);
    const metadataPath = path.join(destination, "release.json");
    const artifactName = `wpsc-${release.version}.bundle.json`;
    const lock = path.join(root, `.publish-${release.version}.lock`);
    let lockAcquired = false;
    await fs.mkdir(root, { recursive: true });
    try {
      await acquireLock(fs, lock, lockRetries, lockRetryMs);
      lockAcquired = true;
      const existing = await readExisting(fs, metadataPath);
      if (existing) {
        if (sameIdentity(existing, release)) return result(input, "IDEMPOTENT_SUCCESS", true, destination);
        return failure("RELEASE_IDENTITY_CONFLICT", "An immutable release with this version already exists.");
      }
      const staging = path.join(root, `.staging-${release.version}-${process.pid}-${Date.now()}`);
      await fs.rm(staging, { force: true, recursive: true });
      try {
        await fs.mkdir(staging, { recursive: true });
        if (options.copyFile) await options.copyFile(artifact, path.join(staging, artifactName));
        else await copyFile(artifact, path.join(staging, artifactName));
        if (options.writeMetadata) await options.writeMetadata(path.join(staging, "release.json"), release);
        else await writeMetadata(path.join(staging, "release.json"), release);
        await fs.rename(staging, destination);
      } catch (error) {
        await fs.rm(staging, { force: true, recursive: true });
        if (error.code === "EEXIST") return failure("RELEASE_IDENTITY_CONFLICT", "An immutable release with this version already exists.");
        throw error;
      }
      return result(input, "PUBLISHED", true, destination);
    } finally { if (lockAcquired) await fs.rm(lock, { force: true, recursive: true }).catch(() => {}); }
  }
  return Object.freeze({ publish, root });
}

function validateRelease(value = {}) { const release = { productId: String(value.productId ?? "wpsc"), version: String(value.version ?? ""), size: Number(value.size), sha256: String(value.sha256 ?? "") }; if (release.productId !== "wpsc" || !/^\d+\.\d+\.\d+$/.test(release.version) || !Number.isSafeInteger(release.size) || release.size <= 0 || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new TypeError("Release metadata is invalid."); return release; }
function sameIdentity(left, right) { return left.productId === right.productId && left.version === right.version && left.size === right.size && left.sha256 === right.sha256; }
async function readExisting(fs, file) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function copyFile(source, target) { const { copyFile } = await import("node:fs/promises"); await copyFile(source, target); }
async function writeMetadata(file, release) { const { writeFile } = await import("node:fs/promises"); await writeFile(file, `${JSON.stringify(release, null, 2)}\n`, { encoding: "utf8", mode: 0o640 }); }
async function hashFile(file) { const { createReadStream } = await import("node:fs"); return new Promise((resolve, reject) => { const digest = createHash("sha256"); const stream = createReadStream(file); stream.on("data", (chunk) => digest.update(chunk)); stream.on("error", reject); stream.on("end", () => resolve(digest.digest("hex"))); }); }
function result(input, status, ok, destination = null) { return { channel: input.channel ?? null, destination: destination ? "[REDACTED]" : null, idempotent: status === "IDEMPOTENT_SUCCESS", mutation: status === "DRY_RUN" ? "NONE" : "PUBLICATION", ok: status === "DRY_RUN" ? true : ok, productId: input.release?.productId ?? "wpsc", sha256: input.release?.sha256 ?? null, size: input.release?.size ?? null, status, version: input.release?.version ?? null, verification: "C041" }; }
function failure(code, message) { return { code, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, status: "REJECTED" }; }
async function acquireLock(fs, lock, retries, retryMs) { for (let attempt = 0; attempt <= retries; attempt += 1) { try { await fs.mkdir(lock); return; } catch (error) { if (error.code !== "EEXIST") throw error; if (attempt === retries) { const conflict = new Error("Another release publication is active."); conflict.code = "PUBLICATION_LOCK_ACTIVE"; throw conflict; } await new Promise((resolve) => setTimeout(resolve, retryMs)); } } }
