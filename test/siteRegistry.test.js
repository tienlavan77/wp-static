import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteMetadata from "../src/site/createSiteMetadata.js";
import createSiteRegistry, {
  createSiteRelativePath
} from "../src/site/createSiteRegistry.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

test("createSiteRegistry lists sites and finds by UUID", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-registry-"));
  const repository = createSiteRepository({
    workspaceDir
  });

  try {
    await repository.writeMetadata("company-a", createSiteMetadata({
      name: "company-a",
      uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1"
    }));
    await repository.writeMetadata("company-b", createSiteMetadata({
      name: "company-b",
      uuid: "a489abcf-7f73-476e-9ddd-e55db4f66a55"
    }));
    for (const siteId of ["company-a", "company-b"]) {
      for (const directory of ["storage", "public", "themes", "plugins"]) {
        await mkdir(path.join(workspaceDir, "sites", siteId, directory), {
          recursive: true
        });
      }
    }

    const registry = createSiteRegistry({
      repository
    });
    const ids = await registry.listSiteIds();
    const site = await registry.findByUuid("a489abcf-7f73-476e-9ddd-e55db4f66a55");

    assert.equal(createSiteRelativePath("company-b"), "sites/company-b");
    assert.deepEqual(ids, ["company-a", "company-b"]);
    assert.equal(site.id, "company-b");
    assert.equal(site.metadata.name, "company-b");
    assert.equal(site.relativePath, "sites/company-b");
    assert.equal(site.relativePath.includes(workspaceDir), false);

    const loaded = await registry.loadSite("company-b");
    assert.equal(loaded.paths.root, path.join(workspaceDir, "sites", "company-b"));
  } finally {
    await rm(workspaceDir, {
      force: true,
      recursive: true
    });
  }
});
