import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteBackupService from "../framework/src/backup/createSiteBackupService.js";
import createSiteRestoreService from "../framework/src/backup/createSiteRestoreService.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Site Restore plans, restores and verifies WPSC Site state", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-restore-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    const original = createSiteMetadata({ name: "Alpha", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" });
    await repository.writeMetadata("alpha", original);
    await repository.writeSettings("alpha", { schema: "wpsc-site-settings", schemaVersion: 1, siteId: "alpha", features: {}, general: { locale: "vi", timezone: "UTC" }, runtime: {}, theme: {} });
    const registry = createSiteRegistry({ repository });
    await registry.register({ siteId: "alpha", domains: ["alpha.example.test"] });
    const backupService = createSiteBackupService({ repository, registry });
    await backupService.create("alpha", { backupId: "before-change" });
    await repository.writeMetadata("alpha", { ...original, name: "Changed" });
    await registry.update("alpha", { domains: ["changed.example.test"] });
    const restore = createSiteRestoreService({ backupService, registry, repository });

    assert.equal((await restore.plan("alpha", "before-change")).plan.operations.includes("metadata.restore"), true);
    const restored = await restore.restore("alpha", "before-change");
    assert.equal(restored.ok, true);
    assert.equal((await repository.readMetadata("alpha")).name, "Alpha");
    assert.equal((await registry.resolveByDomain("alpha.example.test")).siteId, "alpha");
    assert.equal(await registry.resolveByDomain("changed.example.test"), null);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
