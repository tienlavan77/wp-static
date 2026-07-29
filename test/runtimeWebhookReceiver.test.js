import assert from "node:assert/strict";
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createRuntimeWebhookReceiver from "../src/runtime/createRuntimeWebhookReceiver.js";
import createSiteRepository from "../src/site/createSiteRepository.js";

test("Runtime Webhook Receiver verifies persisted secret then submits only to Scheduler", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-webhook-receiver-"));
  const repository = createSiteRepository({ workspaceDir });
  const calls = [];
  try {
    const configDir = path.join(repository.resolveSiteRoot("company-a"), "config");
    await mkdir(configDir, { recursive: true });
    await writeFile(path.join(configDir, "webhook.json"), JSON.stringify({ secret: "secret-value", uuid: "8d20de63-68f1-43cf-a28f-f62a347695a1" }));
    const receiver = createRuntimeWebhookReceiver({ repository, scheduler: { trigger: (input) => { calls.push(input); return { job: { id: "job-1" }, ok: true }; } } });
    const accepted = await receiver.handle("company-a", "8d20de63-68f1-43cf-a28f-f62a347695a1", {
      body: { action: "update", changed: [{ id: "product-1", slug: "product-one", type: "product" }], source: "wordpress" },
      headers: { "x-wpsc-webhook-secret": "secret-value" },
      method: "POST"
    });
    assert.deepEqual(accepted, { body: { changed: ["product:product-one"], jobId: "job-1", ok: true }, status: 202 });
    assert.deepEqual(calls, [{ changed: ["product:product-one"], siteId: "company-a", triggerType: "webhook" }]);
    assert.equal((await receiver.handle("company-a", "8d20de63-68f1-43cf-a28f-f62a347695a1", { headers: {}, method: "POST" })).status, 401);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
