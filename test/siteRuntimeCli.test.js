import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createSiteCreateCommand from "../framework/src/cli/createSiteCreateCommand.js";
import createRuntimeServeCommand from "../framework/src/cli/createRuntimeServeCommand.js";
import createProvisioningService from "../framework/src/provision/createProvisioningService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("site:create provisions a Site Skeleton and persists its domain mapping", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-site-create-"));
  const repository = createSiteRepository({ workspaceDir });
  try {
    const result = await createSiteCreateCommand({ provisioningService: createProvisioningService({ repository }), workspaceDir }).run({ domain: "https://example.test/", siteId: "company-a" });
    assert.equal(result.ok, true);
    assert.equal(result.domain, "example.test");
    assert.equal(JSON.parse(await readFile(result.domainRegistryPath, "utf8")).domains["example.test"], "company-a");
    assert.match(await readFile(result.paths.runtimeEntry, "utf8"), /WPSC Site Runtime front controller/);
    assert.match(await readFile(result.runtimeConfigPath, "utf8"), /demoAdapter/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("runtime:serve loads configuration and opens only the injected HTTP transport", async () => {
  const calls = [];
  const server = {
    once: () => {},
    listen: (port, host, done) => { calls.push(`listen:${host}:${port}`); done(); }
  };
  const command = createRuntimeServeCommand({
    createHttpServer: ({ router }) => { calls.push(`server:${router.name}`); return server; },
    createRuntimeInstance: (config) => { calls.push(`instance:${config.domains["example.test"]}`); return { router: { name: "runtime-router" }, services: {} }; },
    loadRuntimeConfig: async () => ({ config: { domains: { "example.test": "company-a" } }, configPath: "/workspace/runtime.config.js", ok: true, workspaceDir: "/workspace" })
  });
  const result = await command.run({ host: "127.0.0.1", port: 8787 });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["instance:company-a", "server:runtime-router", "listen:127.0.0.1:8787"]);
});
