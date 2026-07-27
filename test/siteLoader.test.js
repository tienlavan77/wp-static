import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteMetadata from "../src/site/createSiteMetadata.js";
import createSiteLoader from "../src/site/createSiteLoader.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

test("createSiteLoader loads metadata and site-local paths", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-loader-"));
  const repository = createSiteRepository({
    workspaceDir
  });
  const metadata = createSiteMetadata({
    name: "tinsinhphat",
    status: "SETUP_REQUIRED",
    uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
  });

  try {
    await repository.writeMetadata("tinsinhphat", metadata);
    const loader = createSiteLoader({
      repository
    });
    const site = await loader.load("tinsinhphat");

    assert.equal(site.id, "tinsinhphat");
    assert.deepEqual(site.metadata, metadata);
    assert.equal(site.pathPolicy.isAllowed(site.paths.publicDist), true);
    assert.equal(site.pathPolicy.isAllowed(path.join(workspaceDir, "sites", "other")), false);
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});
