import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createRouteDependencyGraph from "../framework/src/builder/graph/createRouteDependencyGraph.js";
import createDependencyManifestStore from "../framework/src/runtime/build/createDependencyManifestStore.js";
import { isDependencyManifest } from "../framework/src/runtime/build/createDependencyManifestStore.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Dependency Manifest Store writes and loads a Site-scoped, versioned snapshot", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-dependency-manifest-"));
  const repository = createSiteRepository({ workspaceDir });
  const store = createDependencyManifestStore({ repository });
  try {
    const graph = createRouteDependencyGraph({
      routes: [{ content: { id: 1747, slug: "catalogue", type: "product" }, outputPath: "catalogue/index.html", path: "/catalogue" }]
    });
    const saved = await store.save({ buildId: "build-1", dependenciesByRoute: graph.dependenciesByRoute, siteId: "company-a" });
    const loaded = await store.load("company-a");

    assert.match(saved.path, /sites[\\/]company-a[\\/]storage[\\/]build[\\/]dependency-manifest\.json$/);
    assert.equal(loaded.buildId, "build-1");
    assert.deepEqual(loaded.contentToRoutes["product:1747"], ["/catalogue"]);
    assert.deepEqual(loaded.contentToRoutes["product:catalogue"], ["/catalogue"]);
    assert.equal(await store.load("other-site"), null);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Dependency Manifest Store rejects corrupt route mappings", () => {
  assert.equal(isDependencyManifest({
    buildId: "build-1",
    contentToRoutes: { "product:1747": "/catalogue" },
    routeToDependencies: { "/catalogue": ["product:1747"] },
    schema: "wpsc.route-dependencies",
    schemaVersion: 1,
    siteId: "company-a"
  }, "company-a"), false);
});
