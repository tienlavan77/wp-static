import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createRuntimePlatformProvisioningService from "../framework/src/product/createRuntimePlatformProvisioningService.js";
import createProvisioningService from "../framework/src/provision/createProvisioningService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("platform provisioning creates reusable Runtime artifacts without Site-bound Runtime configuration", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-platform-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    await createProvisioningService({ repository }).createSite({ name: "Company A" });
    const result = await createRuntimePlatformProvisioningService({ repository, workspaceDir }).provision({
      domain: "https://company-a.test/",
      siteId: "company-a"
    });
    assert.equal(result.ok, true);
    assert.match(await readFile(result.runtimeConfigPath, "utf8"), /wordpress-woocommerce/);
    assert.doesNotMatch(await readFile(result.runtimeConfigPath, "utf8"), /site:\s*\{/);
    assert.match(await readFile(result.servicePath, "utf8"), /User=www-data/);
    assert.match(await readFile(result.nginxPath, "utf8"), /root .*sites\/company-a\/public/);
    assert.match(await readFile(result.activationPath, "utf8"), /systemctl enable --now wpsc-runtime/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("platform provisioning requires an existing Site", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-platform-"));
  try {
    await assert.rejects(
      createRuntimePlatformProvisioningService({ workspaceDir }).provision({ domain: "company-a.test", siteId: "company-a" }),
      /ENOENT/
    );
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
