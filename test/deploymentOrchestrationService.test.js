import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createDeploymentArtifactService from "../framework/src/deployment/createDeploymentArtifactService.js";
import createDeploymentOrchestrationService from "../framework/src/deployment/createDeploymentOrchestrationService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Deployment Orchestration deploys ready artifacts and rolls back to a verified prior artifact", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-deploy-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const output = path.join(repository.resolveSiteRoot("alpha"), "public", "dist");
    await mkdir(output, { recursive: true });
    const artifacts = createDeploymentArtifactService({ repository, now: () => "2026-07-31T00:00:00.000Z" });
    for (const [id, html] of [["release-001", "one"], ["release-002", "two"]]) { await writeFile(path.join(output, "index.html"), html); await artifacts.create("alpha", { artifactId: id, buildRef: id, version: "1.0" }); await artifacts.validate("alpha", id); await artifacts.markReady("alpha", id); }
    const actions = [];
    const service = createDeploymentOrchestrationService({ artifactService: artifacts, repository, deployer: { deploy: async ({ artifact }) => actions.push(`deploy:${artifact.artifactId}`), activate: async ({ artifact }) => actions.push(`activate:${artifact.artifactId}`) }, now: () => "2026-07-31T00:00:00.000Z" });
    assert.equal((await service.deploy("alpha", "release-001", { deploymentId: "deployment-1" })).ok, true);
    assert.equal((await service.deploy("alpha", "release-002", { deploymentId: "deployment-2" })).deployment.state, "deployed");
    assert.equal((await service.rollback("alpha", { deploymentId: "rollback-1" })).deployment.artifactId, "release-001");
    assert.deepEqual(actions, ["deploy:release-001", "activate:release-001", "deploy:release-002", "activate:release-002", "deploy:release-001", "activate:release-001"]);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
