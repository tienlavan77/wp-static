import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";
import { ReleaseState } from "./createDeploymentArtifactService.js";

export const DEPLOYMENT_ORCHESTRATION_SCHEMA = "wpsc.deployment-orchestration";
export const DEPLOYMENT_ORCHESTRATION_VERSION = 1;

export default function createDeploymentOrchestrationService(options = {}) {
  const artifacts = options.artifactService;
  const repository = options.repository;
  const deployer = options.deployer;
  if (!artifacts?.readArtifact || !artifacts?.getRelease || !artifacts?.setReleaseState || !repository?.resolveSiteRoot) throw new TypeError("Deployment Orchestration requires Artifact Service and Site Repository.");
  const preflight = options.preflight ?? (async () => ({ ok: true }));
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function deploy(siteId, artifactId, input = {}) {
    if (!deployer?.deploy || !deployer?.activate) return failure("deployment.adapter.unavailable", "Deployment Adapter is not configured.");
    const deploymentId = safeId(input.deploymentId ?? randomUUID(), "Deployment");
    const artifact = await artifacts.readArtifact(siteId, artifactId);
    const release = await artifacts.getRelease(siteId, artifactId);
    if (!artifact.ok || !release.ok) return failure("deployment.artifact.unavailable", "Deployment artifact is unavailable.");
    const deployable = [ReleaseState.READY, ReleaseState.DEPLOYED].includes(release.release.state)
      || (input.rollbackOf && release.release.state === ReleaseState.SUPERSEDED);
    if (!deployable) return failure("deployment.artifact.not_ready", "Only ready or previously deployed artifacts can deploy.");
    const record = { artifactId, createdAt: now(), deploymentId, rollbackOf: input.rollbackOf ?? null, siteId, state: "pending", updatedAt: now() };
    await writeDeployment(siteId, record);
    try {
      const check = await preflight(deepFreeze({ artifact: artifact.artifact, siteId }));
      if (!check?.ok) return failDeployment(siteId, record, "Deployment preflight failed.");
      record.state = "deploying"; record.updatedAt = now(); await writeDeployment(siteId, record);
      await deployer.deploy(deepFreeze({ artifact: artifact.artifact, artifactDir: artifactDirectory(siteId, artifactId), siteId }));
      record.state = "activating"; record.updatedAt = now(); await writeDeployment(siteId, record);
      await deployer.activate(deepFreeze({ artifact: artifact.artifact, artifactDir: artifactDirectory(siteId, artifactId), siteId }));
      const previous = await readActive(siteId);
      record.state = "deployed"; record.deployedAt = now(); record.updatedAt = record.deployedAt; await writeDeployment(siteId, record);
      await writeJson(activePath(siteId), { artifactId, deploymentId, siteId, updatedAt: now() });
      await artifacts.setReleaseState(siteId, artifactId, ReleaseState.DEPLOYED);
      if (previous?.artifactId && previous.artifactId !== artifactId) await artifacts.setReleaseState(siteId, previous.artifactId, ReleaseState.SUPERSEDED);
      return success({ deployment: record });
    } catch (error) { return failDeployment(siteId, record, error.message); }
  }

  async function rollback(siteId, input = {}) {
    const active = await readActive(siteId);
    if (!active) return failure("deployment.rollback.active_missing", "No active deployment is available to roll back.");
    const history = await listDeployments(siteId);
    const candidate = history.filter((entry) => entry.state === "deployed" && entry.artifactId !== active.artifactId).sort((a, b) => b.deployedAt.localeCompare(a.deployedAt))[0];
    if (!candidate) return failure("deployment.rollback.previous_missing", "No previous verified deployment is available.");
    return deploy(siteId, candidate.artifactId, { deploymentId: input.deploymentId, rollbackOf: active.deploymentId });
  }

  async function status(siteId) { return success({ active: await readActive(siteId), deployments: await listDeployments(siteId) }); }
  async function failDeployment(siteId, record, reason) { const failed = { ...record, reason, state: "failed", updatedAt: now() }; await writeDeployment(siteId, failed); await artifacts.setReleaseState(siteId, record.artifactId, ReleaseState.FAILED, reason); return failure("deployment.execution.failed", reason, failed); }
  function root(siteId) { return path.join(repository.resolveSiteRoot(siteId), "storage", "deployments"); }
  function deploymentPath(siteId, deploymentId) { return path.join(root(siteId), `${safeId(deploymentId, "Deployment")}.json`); }
  function activePath(siteId) { return path.join(root(siteId), "active.json"); }
  function artifactDirectory(siteId, artifactId) { return path.join(repository.resolveSiteRoot(siteId), "storage", "artifacts", safeId(artifactId, "Artifact")); }
  async function writeDeployment(siteId, record) { await writeJson(deploymentPath(siteId, record.deploymentId), record); }
  async function readActive(siteId) { try { return JSON.parse(await readFile(activePath(siteId), "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
  async function listDeployments(siteId) { try { const files = (await readdir(root(siteId))).filter((file) => file.endsWith(".json") && file !== "active.json").sort(); return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(root(siteId), file), "utf8")))); } catch (error) { if (error.code === "ENOENT") return []; throw error; } }
  return Object.freeze({ deploy, rollback, status });
}

async function writeJson(target, value) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
function safeId(value, label) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError(`${label} id is invalid.`); return id; }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, schema: DEPLOYMENT_ORCHESTRATION_SCHEMA, schemaVersion: DEPLOYMENT_ORCHESTRATION_VERSION, ...data }); }
function failure(code, message, deployment = null) { return deepFreeze({ deployment, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, schema: DEPLOYMENT_ORCHESTRATION_SCHEMA, schemaVersion: DEPLOYMENT_ORCHESTRATION_VERSION }); }
