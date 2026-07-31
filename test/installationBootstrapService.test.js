import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallationBootstrapService from "../framework/src/product/createInstallationBootstrapService.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("Installation Bootstrap initializes Product configuration, storage and Registry idempotently", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-installation-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const service = createInstallationBootstrapService({ repository, workspaceDir, now: () => "2026-07-31T00:00:00.000Z", validateRuntime: async () => ({ ok: true, readiness: "ready" }) });
    const first = await service.bootstrap({ version: "1.0.0" });
    const second = await service.bootstrap({ version: "2.0.0" });
    assert.equal(first.ok, true);
    assert.equal(first.created.registry, true);
    assert.equal(second.ok, true);
    assert.deepEqual(second.created, { configuration: false, installation: false, registry: false });
    assert.equal(second.configuration.product.version, "1.0.0");
    assert.deepEqual((await repository.readRegistry()).sites, []);
    assert.equal(JSON.parse(await readFile(path.join(workspaceDir, "config", "installation.json"), "utf8")).productId, "wpsc");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Installation Bootstrap leaves an invalid Runtime in not-ready state", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-installation-invalid-"));
  try {
    const repository = createSiteRepository({ workspaceDir });
    const service = createInstallationBootstrapService({ repository, workspaceDir, validateRuntime: async () => ({ ok: false }) });
    const result = await service.bootstrap();
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.errors[0].code, "installation.bootstrap.runtime.not_ready");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
