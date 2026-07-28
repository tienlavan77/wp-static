import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createFirstBuildController from "../src/runtime/createFirstBuildController.js";
import createSiteMetadata from "../src/site/createSiteMetadata.js";
import createSiteRepository from "../src/site/createSiteRepository.js";
import createSiteStateManager from "../src/site/createSiteStateManager.js";

test("First Build Controller uses Scheduler and transitions a ready Site to running", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-first-build-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await repository.writeMetadata("company-a", createSiteMetadata({ name: "Company A", status: "READY_FOR_FIRST_BUILD" }));
    const calls = [];
    const scheduler = {
      tick: async () => { calls.push("tick"); return { build: undefined, diagnostics: { errors: [], warnings: [] }, dispatched: { build: { buildId: "build-1", generatedFiles: ["/public/dist/index.html"], status: "SUCCESS" } }, ok: true }; },
      trigger: (input) => { calls.push(input); return { diagnostics: { errors: [], warnings: [] }, job: { id: "job-1" }, ok: true }; }
    };
    const result = await createFirstBuildController({ repository, scheduler, stateManager: createSiteStateManager() }).build("company-a");
    assert.equal(result.ok, true);
    assert.equal(result.metadata.status, "RUNNING");
    assert.deepEqual(calls, [{ siteId: "company-a", triggerType: "browser" }, "tick"]);
    assert.equal(JSON.parse(await readFile(result.buildPath, "utf8")).status, "SUCCESS");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
