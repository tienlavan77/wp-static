import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createDeploymentArtifactService, { ReleaseState } from "../framework/src/deployment/createDeploymentArtifactService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Deployment Artifact snapshots Builder output immutably and validates integrity", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-artifact-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const output = path.join(repository.resolveSiteRoot("alpha"), "public", "dist");
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, "index.html"), "<h1>Alpha</h1>");
    const service = createDeploymentArtifactService({ repository, now: () => "2026-07-31T00:00:00.000Z" });
    const created = await service.create("alpha", { artifactId: "release-001", buildRef: "build-001", version: "1.0.0" });
    assert.equal(created.ok, true);
    assert.equal(created.artifact.manifest[0].path, "index.html");
    assert.equal(created.release.state, ReleaseState.CREATED);
    assert.equal((await service.validate("alpha", "release-001")).release.state, ReleaseState.VALIDATED);
    assert.equal((await service.markReady("alpha", "release-001")).release.state, ReleaseState.READY);
    assert.equal((await service.create("alpha", { artifactId: "release-001", buildRef: "build-002", version: "1.0.1" })).ok, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
