import assert from "node:assert/strict";
import test from "node:test";
import createBuildEngine from "../framework/src/build/createBuildEngine.js";
import createBuildIntegration from "../framework/src/build/createBuildIntegration.js";
import createJobDispatcher from "../framework/src/scheduler/dispatcher/createJobDispatcher.js";
import createJobQueue from "../framework/src/scheduler/queue/createJobQueue.js";

test("Runtime Build Integration forwards phase and Builder progress without changing output ownership", async () => {
  const events = [];
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "progress-build" }),
    contentReader: { read: async () => ({ collections: {}, items: [] }) },
    outputPipeline: { write: async () => ({ generatedFiles: [], ok: true }) },
    runtimeV1Builder: { build: async (input) => { input.onProgress({ message: "Writing HTML", stage: "html:write" }); return { assets: [], incremental: { fullBuild: true }, result: { pagesWritten: 0, totalPages: 0 } }; } }
  });
  const result = await integration.build({ onProgress: (event) => events.push(event), siteId: "site-a", triggerType: "cli" });
  assert.equal(result.status, "SUCCESS");
  assert.deepEqual(events.map((event) => event.stage), ["source:start", "source:finish", "build:start", "html:write", "build:finish", "publish:start", "publish:finish"]);
});

test("Dispatcher forwards optional Build progress without storing it in immutable Job metadata", async () => {
  const queue = createJobQueue({ createJobId: () => "job-progress" });
  queue.enqueue({ siteId: "site-a", triggerType: "cli" });
  const progress = [];
  const dispatcher = createJobDispatcher({ buildEngine: { build: async (input) => { input.onProgress({ message: "Planning", stage: "build:start" }); return { diagnostics: { errors: [], warnings: [] }, status: "SUCCESS" }; } }, onBuildProgress: (event) => progress.push(event), queue });
  const result = await dispatcher.dispatch();
  assert.equal(result.ok, true);
  assert.deepEqual(progress, [{ message: "Planning", stage: "build:start" }]);
  assert.equal(Object.hasOwn(result.job, "onProgress"), false);
});
