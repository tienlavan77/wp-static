import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallerController from "../src/runtime/createInstallerController.js";
import createSiteRuntime, { createInstallationCheck, createSiteResolver, createSiteRuntimeSkeleton } from "../src/runtime/createSiteRuntime.js";
import createSetupService from "../src/setup/createSetupService.js";
import createSiteRepository from "../src/site/createSiteRepository.js";
import createSiteStateManager from "../src/site/createSiteStateManager.js";

test("Installer shares Setup Service, persists configuration, and makes the Site ready for first build", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-installer-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await createSiteRuntimeSkeleton({ repository, siteId: "company-a" });
    const setupService = createSetupService({ createSessionId: () => "setup-1" });
    const installer = createInstallerController({ repository, setupService, stateManager: createSiteStateManager() });
    const started = installer.begin("company-a");
    const completed = await installer.complete({ configuration: { locale: "vi" }, sessionId: started.session.id });
    assert.equal(completed.ok, true);
    assert.equal(completed.metadata.status, "READY_FOR_FIRST_BUILD");
    assert.deepEqual(JSON.parse(await readFile(completed.configurationPath, "utf8")), { locale: "vi" });
    const runtime = createSiteRuntime({ installationCheck: createInstallationCheck(repository), siteResolver: createSiteResolver({ domains: { "example.test": "company-a" } }) });
    assert.equal((await runtime.handle({ host: "example.test" })).route, "dashboard");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
