import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createContentSnapshotStore from "../framework/src/runtime/build/createContentSnapshotStore.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Content Snapshot Store saves a Site-scoped published content snapshot", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-content-snapshot-"));
  const store = createContentSnapshotStore({ repository: createSiteRepository({ workspaceDir }) });
  try {
    await store.save({ buildId: "build-1", collections: { terms: [] }, items: [{ id: 1, slug: "product", type: "product" }], siteId: "company-a" });
    const snapshot = await store.load("company-a");
    assert.equal(snapshot.buildId, "build-1");
    assert.equal(snapshot.items[0].slug, "product");
    assert.equal(await store.load("company-b"), null);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
