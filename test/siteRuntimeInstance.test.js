import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteRuntimeInstance from "../src/runtime/createSiteRuntimeInstance.js";
import { createSiteRuntimeSkeleton } from "../src/runtime/createSiteRuntime.js";
import createSiteRepository from "../src/site/createSiteRepository.js";
import { SchedulerState } from "../src/scheduler/schedulerContracts.js";

function adapter() { return { getMetadata: async () => ({ adapterVersion: "1", capabilities: [], sourceType: "rest" }), healthCheck: async () => ({ ok: true }), initialize: async () => ({ ok: true }), registerWebhook: async () => ({ ok: true, webhookId: "hook-1" }), unregisterWebhook: async () => ({ ok: true }), validate: async () => ({ ok: true }), verifyWebhook: async () => ({ ok: true }) }; }

test("Site Runtime Instance wires real services into one Router composition", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-instance-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await createSiteRuntimeSkeleton({ repository, siteId: "company-a" });
    const instance = createSiteRuntimeInstance({
      adapterLoader: { load: () => adapter() },
      contentReader: { read: async () => ({ assets: [], items: [] }) },
      domains: { "example.test": "company-a" },
      repository,
      webhookBaseUrl: "https://example.test/webhook"
    });
    assert.equal(instance.services.repository, repository);
    assert.equal(instance.services.setupService, instance.composition.get("setupService"));
    assert.equal(instance.services.scheduler.getState(), SchedulerState.RUNNING);
    const page = await instance.router.handle({ host: "example.test", method: "GET", path: "/" });
    assert.equal(page.headers["content-type"], "text/html; charset=utf-8");
    assert.match(page.body, /Set up company-a/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
