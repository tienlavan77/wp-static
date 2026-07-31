import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteBackupService from "../framework/src/backup/createSiteBackupService.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRegistry from "../framework/src/site/createSiteRegistry.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Site Backup creates a verifiable Site-scoped operational snapshot without secrets", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-backup-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("alpha", createSiteMetadata({ name: "Alpha", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    await repository.writeSettings("alpha", { schema: "wpsc-site-settings", schemaVersion: 1, siteId: "alpha", general: { locale: "vi", timezone: "UTC" }, runtime: {}, theme: {}, features: {} });
    const registry = createSiteRegistry({ repository });
    await registry.register({ siteId: "alpha", domains: ["alpha.example.test"], runtimeConfigRef: "config/runtime.json" });
    const service = createSiteBackupService({ repository, registry, now: () => "2026-07-31T00:00:00.000Z", readers: { queue: () => ({ pending: 1, providerToken: "never-store-me" }), scheduler: () => ({ status: "idle" }) } });
    const created = await service.create("alpha", { backupId: "backup-001", retention: { policy: "seven-days" } });

    assert.equal(created.ok, true);
    assert.equal(created.backup.scope, "wpsc-operational-state");
    assert.equal(created.backup.state.queue.providerToken, "[REDACTED]");
    assert.equal(created.backup.state.site.siteId, "alpha");
    assert.equal((await service.verify("alpha", "backup-001")).verified, true);
    assert.equal((await service.list("alpha")).backups[0].backupId, "backup-001");
    assert.equal((await service.verify("beta", "backup-001")).ok, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
