import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (relative) => readFile(new URL(relative, root), "utf8");

test("C026 Phase 19 preserves Runtime scheduling and output authority boundaries", async () => {
  const [runtime, integration, output, receiver, coordinator] = await Promise.all([
    source("framework/src/runtime/bootstrap/createSiteRuntimeInstance.js"),
    source("framework/src/build/createBuildIntegration.js"),
    source("framework/src/output/createOutputPipeline.js"),
    source("framework/src/runtime/webhook/createRuntimeWebhookReceiver.js"),
    source("framework/src/publishing/createPublishEventCoordinator.js")
  ]);
  assert.match(runtime, /createJobDispatcher\(\{ buildEngine: buildIntegration,(?: onBuildProgress: options\.onBuildProgress,)? queue \}\)/);
  assert.match(runtime, /createScheduler\(\{ dispatcher, queue,/);
  assert.match(runtime, /createRuntimeWebhookReceiver\(\{ cache: siteCache, repository, scheduler \}\)/);
  assert.match(receiver, /publishing\.publish\(/);
  assert.doesNotMatch(receiver, /buildIntegration\.build\(/);
  assert.match(coordinator, /scheduler\.trigger\(/);
  assert.match(integration, /outputPipeline\.write\(/);
  assert.doesNotMatch(integration, /writeFile\(/);
  assert.match(output, /async function publishSnapshot/);
});

test("C026 Phase 19 preserves fallback-to-full and secret-boundary evidence hooks", async () => {
  const [integration, transitions, e2e] = await Promise.all([
    source("framework/src/build/createBuildIntegration.js"),
    source("framework/src/build/createContentTransitionPlan.js"),
    source("test/runtimeWordpressWooCommerceE2E.test.js")
  ]);
  assert.match(transitions, /forceFullBuild: destructive\.length > 0 \|\| rename/);
  assert.match(integration, /replace: built\.incremental\?\.fullBuild === true/);
  assert.match(e2e, /Credentials remain Runtime configuration only/);
  assert.match(e2e, /verified public snapshot on source failure/);
  assert.match(e2e, /destructive Runtime path/);
  assert.match(e2e, /slug transition with the frozen browser redirect fallback/);
});
