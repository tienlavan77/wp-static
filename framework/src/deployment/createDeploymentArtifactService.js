import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";

export const DEPLOYMENT_ARTIFACT_SCHEMA = "wpsc.deployment-artifact";
export const DEPLOYMENT_ARTIFACT_VERSION = 1;
export const ReleaseState = Object.freeze({ CREATED: "created", DEPLOYED: "deployed", FAILED: "failed", READY: "ready", SUPERSEDED: "superseded", VALIDATED: "validated" });

export default function createDeploymentArtifactService(options = {}) {
  const repository = options.repository;
  if (!repository?.resolveSiteRoot) throw new TypeError("Deployment Artifact Service requires a Site Repository.");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function create(siteId, input = {}) {
    const artifactId = safeId(input.artifactId ?? randomUUID(), "Artifact");
    const root = artifactRoot(siteId, artifactId);
    const sourceDir = path.resolve(input.outputDir ?? path.join(repository.resolveSiteRoot(siteId), "public", "dist"));
    const output = path.join(root, "public");
    try {
      await assertDoesNotExist(path.join(root, "artifact.json"));
      const manifest = await createManifest(sourceDir);
      const artifact = deepFreeze({
        artifactId,
        buildRef: required(input.buildRef, "Build reference"),
        createdAt: now(),
        integrity: manifest.integrity,
        manifest: manifest.files,
        runtimeCompatibility: input.runtimeCompatibility ?? "1.0",
        schema: DEPLOYMENT_ARTIFACT_SCHEMA,
        schemaVersion: DEPLOYMENT_ARTIFACT_VERSION,
        siteId: safeSiteId(siteId),
        version: required(input.version, "Artifact version")
      });
      await mkdir(root, { recursive: true });
      await cp(sourceDir, output, { recursive: true, errorOnExist: true, force: false });
      await writeJson(path.join(root, "artifact.json"), artifact);
      await writeJson(releasePath(siteId, artifactId), { artifactId, createdAt: artifact.createdAt, siteId: artifact.siteId, state: ReleaseState.CREATED, updatedAt: artifact.createdAt });
      return success({ artifact, release: await readRelease(siteId, artifactId) });
    } catch (error) { return failure("deployment.artifact.create.failed", error.message); }
  }

  async function validate(siteId, artifactId) {
    const artifact = await readArtifact(siteId, artifactId);
    if (!artifact.ok) return artifact;
    const valid = (await createManifest(path.join(artifactRoot(siteId, artifactId), "public"))).integrity.checksum === artifact.artifact.integrity.checksum;
    if (!valid) return transition(siteId, artifactId, ReleaseState.FAILED, "Artifact integrity verification failed.");
    return transition(siteId, artifactId, ReleaseState.VALIDATED);
  }

  async function markReady(siteId, artifactId) {
    const current = await readRelease(siteId, artifactId);
    if (current.state !== ReleaseState.VALIDATED) return failure("deployment.release.not_validated", "Only validated artifacts can become ready.");
    return transition(siteId, artifactId, ReleaseState.READY);
  }

  async function getRelease(siteId, artifactId) {
    try { return success({ release: deepFreeze(await readRelease(siteId, artifactId)) }); }
    catch (error) { return failure("deployment.release.not_found", "Deployment release was not found."); }
  }

  async function setReleaseState(siteId, artifactId, state, reason = null) {
    if (!Object.values(ReleaseState).includes(state)) return failure("deployment.release.state.invalid", "Deployment release state is invalid.");
    return transition(siteId, artifactId, state, reason);
  }

  async function readArtifact(siteId, artifactId) {
    try { return success({ artifact: deepFreeze(JSON.parse(await readFile(path.join(artifactRoot(siteId, artifactId), "artifact.json"), "utf8"))) }); }
    catch (error) { return failure(error.code === "ENOENT" ? "deployment.artifact.not_found" : "deployment.artifact.read.failed", error.code === "ENOENT" ? "Deployment artifact was not found." : error.message); }
  }

  async function transition(siteId, artifactId, state, reason = null) {
    try {
      const release = await readRelease(siteId, artifactId);
      const next = { ...release, reason, state, updatedAt: now() };
      await writeJson(releasePath(siteId, artifactId), next);
      return success({ release: deepFreeze(next) });
    } catch (error) { return failure("deployment.release.transition.failed", error.message); }
  }

  function artifactRoot(siteId, artifactId) { return path.join(repository.resolveSiteRoot(safeSiteId(siteId)), "storage", "artifacts", safeId(artifactId, "Artifact")); }
  function releasePath(siteId, artifactId) { return path.join(artifactRoot(siteId, artifactId), "release.json"); }
  async function readRelease(siteId, artifactId) { return JSON.parse(await readFile(releasePath(siteId, artifactId), "utf8")); }
  return Object.freeze({ create, getRelease, markReady, readArtifact, setReleaseState, validate });
}

async function createManifest(root) { const files = await walk(root); return { files, integrity: { algorithm: "sha256", checksum: hash(JSON.stringify(files)) } }; }
async function walk(root, relative = "") { const directory = path.join(root, relative); const entries = await readdir(directory, { withFileTypes: true }); const output = []; for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) { const child = path.join(relative, entry.name); if (entry.isDirectory()) output.push(...await walk(root, child)); else if (entry.isFile()) { const value = await readFile(path.join(root, child)); output.push({ path: child.split(path.sep).join("/"), sha256: hash(value), size: value.length }); } } return output; }
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
async function writeJson(target, value) { await mkdir(path.dirname(target), { recursive: true }); const temp = `${target}.tmp`; await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temp, target); }
async function assertDoesNotExist(target) { try { await readFile(target); throw new Error("Deployment artifact already exists and is immutable."); } catch (error) { if (error.code === "ENOENT") return; throw error; } }
function safeSiteId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("A valid Site id is required."); return id; }
function safeId(value, label) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError(`${label} id is invalid.`); return id; }
function required(value, label) { const text = String(value ?? "").trim(); if (!text) throw new TypeError(`${label} is required.`); return text; }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
