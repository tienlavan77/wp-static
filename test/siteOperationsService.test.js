import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";
import createSiteOperationsService from "../framework/src/operations/createSiteOperationsService.js";

test("Site Operations Control Plane inspects one Site and preserves isolation", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-operations-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("alpha", createSiteMetadata({ name: "Alpha", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    await repository.writeMetadata("beta", createSiteMetadata({ name: "Beta", uuid: "a489abcf-7f73-476e-9ddd-e55db4f66a55" }));
    const registry = createSiteRegistry({ repository });
    await registry.register({ siteId: "alpha", domains: ["alpha.example.test"] });
    await registry.register({ siteId: "beta", domains: ["beta.example.test"] });
    const service = createSiteOperationsService({
      registry,
      readers: {
        build: (siteId) => ({ siteId, status: "SUCCESS" }),
        queue: (siteId) => ({ siteId, pending: 0 }),
        runtime: (siteId) => ({ siteId, status: "healthy" })
      }
    });

    const inspected = await service.inspect("alpha");
    assert.equal(inspected.ok, true);
    assert.equal(inspected.site.id, "alpha");
    assert.equal(inspected.state.build.siteId, "alpha");
    assert.equal(inspected.state.queue.siteId, "alpha");
    assert.equal(Object.isFrozen(inspected), true);
    assert.equal((await service.inspect("missing")).ok, false);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});

test("Site Operations Control Plane enables and disables only the requested Site", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-operations-state-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("alpha", createSiteMetadata({ name: "Alpha", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    const registry = createSiteRegistry({ repository });
    await registry.register({ siteId: "alpha", domains: ["alpha.example.test"] });
    const service = createSiteOperationsService({ registry });

    assert.equal((await service.disable("alpha")).site.status, "suspended");
    assert.equal(await registry.resolveByDomain("alpha.example.test"), null);
    assert.equal((await service.enable("alpha")).site.status, "active");
    assert.equal((await registry.resolveByDomain("alpha.example.test")).siteId, "alpha");
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
