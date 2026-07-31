import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createRuntimeComposition from "../framework/src/runtime/bootstrap/createRuntimeComposition.js";
import { SITE_RUNTIME_INDEX_PHP, createSiteRuntimeSkeleton } from "../framework/src/runtime/bootstrap/createSiteRuntime.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Runtime Composition wires one shared Repository, Setup Service, and Runtime controllers", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-composition-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await createSiteRuntimeSkeleton({ repository, siteId: "company-a" });
    const composition = createRuntimeComposition({ domains: { "example.test": "company-a" }, repository });
    assert.equal(composition.get("repository"), repository);
    assert.equal(composition.get("installer").begin("company-a").ok, true);
    assert.equal((await composition.get("runtime").handle({ host: "example.test" })).route, "installer");
    assert.equal(Object.isFrozen(composition.services), true);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Site Runtime PHP front controller proxies to configured Node Runtime origin", () => {
  assert.match(SITE_RUNTIME_INDEX_PHP, /WPSC_RUNTIME_ORIGIN/);
  assert.match(SITE_RUNTIME_INDEX_PHP, /file_get_contents\(\$runtimeOrigin/);
});
