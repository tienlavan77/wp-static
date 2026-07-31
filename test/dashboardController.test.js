import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createDashboardController from "../framework/src/runtime/dashboard/createDashboardController.js";
import createSiteMetadata from "../framework/src/site/createSiteMetadata.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Dashboard reads site metadata, runtime state, source status, and injected build status", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-dashboard-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("company-a", createSiteMetadata({ name: "Company A", status: "READY_FOR_FIRST_BUILD" }));
    await repository.writeSourceMetadata("company-a", { sourceType: "wordpress", webhookStatus: "verified" });
    const dashboard = createDashboardController({ buildStatusProvider: { get: async () => ({ status: "SUCCESS" }) }, repository });
    const snapshot = await dashboard.show("company-a");
    assert.equal(snapshot.ok, true);
    assert.equal(snapshot.metadata.status, "READY_FOR_FIRST_BUILD");
    assert.equal(snapshot.source.sourceType, "wordpress");
    assert.equal(snapshot.build.status, "SUCCESS");
    assert.match(dashboard.render(snapshot), /Company A/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Dashboard treats absent source metadata as not connected", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-dashboard-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("company-a", createSiteMetadata({ name: "Company A", status: "SETUP_REQUIRED" }));
    const snapshot = await createDashboardController({ repository }).show("company-a");
    assert.equal(snapshot.ok, true);
    assert.equal(snapshot.source.connected, false);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
