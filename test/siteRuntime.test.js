import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteRepository from "../src/site/createSiteRepository.js";
import createSiteRuntime, { createInstallationCheck, createSiteResolver, createSiteRuntimeSkeleton } from "../src/runtime/createSiteRuntime.js";

test("Site Runtime Skeleton creates public index.php and setup-required metadata", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-runtime-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    const skeleton = await createSiteRuntimeSkeleton({ repository, siteId: "company-a" });
    assert.match(await readFile(skeleton.indexPath, "utf8"), /WPSC Site Runtime front controller/);
    assert.equal((await repository.readMetadata("company-a")).status, "SETUP_REQUIRED");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Site Runtime resolves a domain and routes uninstalled sites to Installer", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-runtime-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await createSiteRuntimeSkeleton({ repository, siteId: "company-a" });
    const runtime = createSiteRuntime({ installationCheck: createInstallationCheck(repository), siteResolver: createSiteResolver({ domains: { "example.test": "company-a" } }) });
    const result = await runtime.handle({ host: "example.test" });
    assert.equal(result.ok, true);
    assert.equal(result.route, "installer");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
