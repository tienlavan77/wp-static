import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry, {
  createSiteRelativePath,
  SiteOperationalStatus
} from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

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

test("Site Registry owns Site-scoped domains and operational lifecycle without changing Site metadata", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-multisite-registry-"));
  const repository = createSiteRepository({ workspaceDir });

  try {
    for (const [siteId, uuid] of [["company-a", "8d20de63-68f1-43cf-a28f-f62a347695a1"], ["company-b", "a489abcf-7f73-476e-9ddd-e55db4f66a55"]]) {
      await repository.writeMetadata(siteId, createSiteMetadata({ name: siteId, uuid }));
    }
    const registry = createSiteRegistry({ repository, now: () => "2026-07-31T00:00:00.000Z" });
    const registered = await registry.register({
      domains: ["https://a.example.test", "www.a.example.test"],
      environment: "production",
      runtimeConfigRef: "config/runtime.json",
      siteId: "company-a"
    });

    assert.equal(registered.status, SiteOperationalStatus.ACTIVE);
    assert.deepEqual(registered.domains, ["a.example.test", "www.a.example.test"]);
    assert.equal((await registry.resolveContext("https://a.example.test")).siteId, "company-a");
    assert.equal((await registry.resolveByDomain("www.a.example.test")).runtimeConfigRef, "config/runtime.json");

    await assert.rejects(
      registry.register({ domains: ["a.example.test"], siteId: "company-b" }),
      /already mapped/
    );
    await registry.setStatus("company-a", SiteOperationalStatus.SUSPENDED);
    assert.equal(await registry.resolveContext("a.example.test"), null);
    assert.equal((await repository.readMetadata("company-a")).status, "CREATED");
    assert.equal((await registry.read()).sites.length, 1);
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
});
