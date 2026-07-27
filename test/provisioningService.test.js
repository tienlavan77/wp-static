import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProvisioningService, {
  PROVISIONING_SERVICE_VERSION,
  SITE_PROVISIONING_DIRECTORIES
} from "../src/provision/createProvisioningService.js";
import { SiteState } from "../src/site/createSiteMetadata.js";
import createSiteLoader from "../src/site/createSiteLoader.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

test("createProvisioningService creates an isolated site skeleton", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-provision-"));
  const repository = createSiteRepository({
    workspaceDir
  });
  const service = createProvisioningService({
    repository
  });

  try {
    const result = await service.createSite({
      name: "Tin Sinh Phat",
      now: "2026-07-27T00:00:00.000Z",
      uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
    });

    assert.equal(service.version, PROVISIONING_SERVICE_VERSION);
    assert.equal(result.ok, true);
    assert.equal(result.siteId, "tin-sinh-phat");
    assert.equal(result.metadata.status, SiteState.SETUP_REQUIRED);
    assert.equal(result.metadata.uuid, "8d20de63-68f1-43cf-a28f-f62a347695a1");

    for (const directory of SITE_PROVISIONING_DIRECTORIES) {
      await access(path.join(workspaceDir, "sites", "tin-sinh-phat", directory));
    }

    const loader = createSiteLoader({
      repository
    });
    const site = await loader.load("tin-sinh-phat");
    assert.equal(site.metadata.name, "Tin Sinh Phat");
    assert.equal(site.pathPolicy.isAllowed(site.paths.publicDist), true);
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});

test("createProvisioningService reports missing site id", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-provision-missing-"));
  const service = createProvisioningService({
    workspaceDir
  });

  try {
    const result = await service.createSite({});

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.diagnostics.errors.map((error) => error.code),
      ["provision.site_id.required"]
    );
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});
