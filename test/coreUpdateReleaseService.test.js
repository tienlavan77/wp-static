import assert from "node:assert/strict";
import test from "node:test";
import createProductManagementCli from "../framework/src/cli/createProductManagementCli.js";
import createCoreUpdateReleaseService from "../framework/src/product/update/createCoreUpdateReleaseService.js";

const release = (version) => ({ architecture: "2.02", packageId: `wpsc-${version}`, product: "wpsc", runtime: ">=1.0.0", version });

test("Core Update Release Service finds the newest compatible-shaped release without mutation", async () => {
  const service = createCoreUpdateReleaseService({ currentVersion: "1.0.0", source: { list: async () => [release("1.0.1"), release("1.2.0"), release("1.1.0")] } });
  const checked = await service.check();
  assert.equal(checked.status, "UPDATE_AVAILABLE");
  assert.equal(checked.available.version, "1.2.0");
});

test("Core Update Release Service selects the true SemVer maximum across multi-digit versions", async () => {
  const service = createCoreUpdateReleaseService({ currentVersion: "1.0.0", source: { list: async () => [release("1.9.99"), release("1.10.0"), release("2.0.0"), release("1.99.99")] } });
  assert.equal((await service.check()).available.version, "2.0.0");
  const minor = createCoreUpdateReleaseService({ currentVersion: "1.0.0", source: { list: async () => [release("1.9.99"), release("1.10.0")] } });
  assert.equal((await minor.check()).available.version, "1.10.0");
});

test("Core Update Release Service reports up to date and rejects invalid/unavailable sources", async () => {
  assert.equal((await createCoreUpdateReleaseService({ currentVersion: "1.2.0", source: { list: async () => [release("1.1.0")] } }).check()).status, "UP_TO_DATE");
  assert.equal((await createCoreUpdateReleaseService({ currentVersion: "1.0.0", source: { list: async () => [{ version: "1.2.0" }] } }).check()).ok, false);
  assert.equal((await createCoreUpdateReleaseService({ currentVersion: "1.0.0", source: { list: async () => { throw new Error("offline"); } } }).check()).diagnostics.errors[0].code, "core_update.release.unavailable");
});

test("Product CLI exposes read-only wpsc update check", async () => {
  const cli = createProductManagementCli({ backup: { list: async () => ({}) }, deployment: { status: async () => ({}) }, operations: { list: async () => ({}), inspect: async () => ({}) }, registry: { read: async () => ({}) }, update: { check: async () => ({ available: release("1.1.0"), currentVersion: "1.0.0", ok: true, status: "UPDATE_AVAILABLE" }) } });
  const result = await cli.run(["update", "check"]);
  assert.equal(result.code, 0);
  assert.match(result.output, /Available: 1.1.0/);
});
