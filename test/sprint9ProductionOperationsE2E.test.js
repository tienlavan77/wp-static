import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteBackupService from "../framework/src/backup/createSiteBackupService.js";
import createSiteRestoreService from "../framework/src/backup/createSiteRestoreService.js";
import createDeploymentArtifactService from "../framework/src/deployment/createDeploymentArtifactService.js";
import createDeploymentOrchestrationService from "../framework/src/deployment/createDeploymentOrchestrationService.js";
import createSiteHealthService from "../framework/src/monitoring/createSiteHealthService.js";
import createOperationalObservabilityService from "../framework/src/observability/createOperationalObservabilityService.js";
import createRuntimeHardeningService from "../framework/src/runtime/hardening/createRuntimeHardeningService.js";
import createOperationsAuthorizationService, { OperationsCapability } from "../framework/src/security/createOperationsAuthorizationService.js";
import createSecretsBoundaryService from "../framework/src/security/createSecretsBoundaryService.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Sprint 9 production operations keep two Sites isolated across backup, security, health and deployment", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-sprint9-e2e-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const sites = [["alpha", "8d20de63-68f1-43cf-a28f-f62a347695a1"], ["beta", "a489abcf-7f73-476e-9ddd-e55db4f66a55"]];
    for (const [siteId, uuid] of sites) {
      await repository.writeMetadata(siteId, createSiteMetadata({ name: siteId, uuid }));
      await repository.writeSettings(siteId, { schema: "wpsc-site-settings", schemaVersion: 1, siteId, features: {}, general: { locale: "vi", timezone: "UTC" }, runtime: {}, theme: {} });
      const output = path.join(repository.resolveSiteRoot(siteId), "public", "dist");
      await mkdir(output, { recursive: true });
      await writeFile(path.join(output, "index.html"), `<h1>${siteId}</h1>`);
    }
    const registry = createSiteRegistry({ repository });
    await registry.register({ siteId: "alpha", domains: ["alpha.example.test"] });
    await registry.register({ siteId: "beta", domains: ["beta.example.test"] });
    assert.equal((await registry.resolveContext("alpha.example.test")).siteId, "alpha");
    assert.equal((await registry.resolveContext("beta.example.test")).siteId, "beta");

    const observability = createOperationalObservabilityService({ repository });
    const authorization = createOperationsAuthorizationService({ audit: observability, grants: [{ actorId: "operator", capabilities: [OperationsCapability.BACKUP], siteIds: ["alpha"] }] });
    assert.equal((await authorization.authorize({ capability: OperationsCapability.BACKUP, operator: { id: "operator" }, siteId: "alpha" })).allowed, true);
    assert.equal((await authorization.authorize({ capability: OperationsCapability.BACKUP, operator: { id: "operator" }, siteId: "beta" })).allowed, false);

    const backups = createSiteBackupService({ repository, registry });
    await backups.create("alpha", { backupId: "alpha-before" });
    assert.equal((await backups.list("beta")).backups.length, 0);
    await repository.writeMetadata("alpha", { ...(await repository.readMetadata("alpha")), name: "changed" });
    const restore = createSiteRestoreService({ backupService: backups, registry, repository });
    assert.equal((await restore.restore("alpha", "alpha-before")).ok, true);
    assert.equal((await repository.readMetadata("alpha")).name, "alpha");
    assert.equal((await repository.readMetadata("beta")).name, "beta");

    const health = createSiteHealthService({ registry, checks: { runtime: { category: "runtime", check: ({ siteId }) => ({ details: { siteId }, state: "healthy" }) }, wordpress: { category: "dependency", check: () => ({ state: "healthy" }) } } });
    assert.equal((await health.inspect("alpha")).health, "healthy");
    assert.equal((await health.inspect("beta")).checks[0].details.siteId, "beta");

    const secrets = createSecretsBoundaryService({ credentialStore: { read: async (siteId) => ({ applicationPassword: `${siteId}-secret` }) } });
    const alphaReference = secrets.createReference("alpha", "applicationPassword");
    assert.equal(await secrets.withSecret("alpha", alphaReference, (value) => value), "alpha-secret");
    await assert.rejects(secrets.withSecret("beta", alphaReference, () => undefined), /cannot cross Site/);

    const artifacts = createDeploymentArtifactService({ repository });
    for (const siteId of ["alpha", "beta"]) { await artifacts.create(siteId, { artifactId: `${siteId}-r1`, buildRef: `${siteId}-build`, version: "1.0" }); await artifacts.validate(siteId, `${siteId}-r1`); await artifacts.markReady(siteId, `${siteId}-r1`); }
    const activations = [];
    const deployments = createDeploymentOrchestrationService({ artifactService: artifacts, repository, deployer: { deploy: async ({ siteId }) => activations.push(`deploy:${siteId}`), activate: async ({ siteId }) => activations.push(`active:${siteId}`) } });
    await deployments.deploy("alpha", "alpha-r1", { deploymentId: "alpha-deploy" });
    await deployments.deploy("beta", "beta-r1", { deploymentId: "beta-deploy" });
    assert.deepEqual((await deployments.status("alpha")).active.artifactId, "alpha-r1");
    assert.deepEqual((await deployments.status("beta")).active.artifactId, "beta-r1");
    assert.deepEqual(activations, ["deploy:alpha", "active:alpha", "deploy:beta", "active:beta"]);

    const runtime = createRuntimeHardeningService({ checks: { runtime: async () => ({ ok: true }) } });
    await runtime.startup();
    assert.equal((await runtime.run("alpha", async ({ siteId }) => siteId)).result, "alpha");
    assert.equal((await runtime.shutdown()).readiness, "stopped");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
