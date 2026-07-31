import assert from "node:assert/strict";
import test from "node:test";
import createBuildEngine, {
  BUILD_ENGINE_VERSION,
  BuildClient,
  BuildEvent,
  BuildState,
  createBuildContext,
  createBuildResult
} from "../framework/src/build/createBuildEngine.js";

test("Build Engine foundation creates an immutable validated context", () => {
  const result = createBuildContext({ client: BuildClient.CLI, siteId: " company-a " });
  assert.equal(result.ok, true);
  assert.deepEqual(result.context, { client: "cli", siteId: "company-a" });
  assert.equal(Object.isFrozen(result.context), true);
  assert.throws(() => { result.context.siteId = "other"; }, TypeError);
});

test("Build Engine owns start, finish, and failure workflow without source or output work", () => {
  const times = ["2026-07-29T00:00:00.000Z", "2026-07-29T00:00:02.000Z", "2026-07-29T00:00:05.000Z"];
  const engine = createBuildEngine({ createBuildId: () => "build-1", now: () => times.shift() });
  const started = engine.start({ client: BuildClient.CLI, siteId: "company-a" });
  assert.equal(started.status, BuildState.BUILDING);
  assert.equal(started.events[0].type, BuildEvent.STARTED);
  assert.equal(started.context.siteId, "company-a");
  const finished = engine.finish("build-1", { generatedFiles: ["index.html"] });
  assert.equal(finished.status, BuildState.SUCCESS);
  assert.equal(finished.duration, 2000);
  assert.deepEqual(finished.generatedFiles, ["index.html"]);
  assert.equal(finished.events[0].type, BuildEvent.COMPLETED);

  const failedBuild = engine.start({ client: BuildClient.CLI, siteId: "company-b" });
  const failed = engine.fail(failedBuild.buildId, { diagnostics: { errors: [{ code: "build.test.failed", message: "Test failure", severity: "error" }], warnings: [] } });
  assert.equal(failed.status, BuildState.FAILED);
  assert.equal(failed.events[0].type, BuildEvent.FAILED);
  assert.equal(failed.diagnostics.errors[0].code, "build.test.failed");
});

test("Build Engine foundation returns shared diagnostics and immutable result contracts", () => {
  const context = createBuildContext({ client: BuildClient.BROWSER, siteId: "company-a" }).context;
  const result = createBuildResult({ context, events: [{ type: BuildEvent.STARTED }], ok: true });
  assert.equal(result.ok, true);
  assert.equal(result.output, null);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(createBuildEngine().version, BUILD_ENGINE_VERSION);
  assert.deepEqual(createBuildContext({}).diagnostics.errors.map((item) => item.code), ["build.context.client.invalid", "build.context.site_id.required"]);
});
