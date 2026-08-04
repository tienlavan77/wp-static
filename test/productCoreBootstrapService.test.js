import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdir, mkdtemp, readFile, readlink, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProductCoreBootstrapService, createProductionDependencyEvidence, createProductionPackageBuilder, createProductionPackageVerifier } from "../framework/src/index.js";
import createSiteRepository from "../framework/src/site/createSiteRepository.js";

test("C042 bootstraps verified Product/Core version and atomically creates core/active", async () => {
  const fixture = await verifiedFixture();
  const repository = createSiteRepository({ workspaceDir: fixture.workspace });
  const service = createProductCoreBootstrapService({ now: () => "2026-08-04T00:00:00.000Z", repository, workspace: fixture.workspace });
  const result = await service.bootstrap({ extractedPath: fixture.extracted, verified: fixture.verified });
  assert.equal(result.ok, true);
  assert.equal(result.version, "1.2.3");
  assert.equal(await readlink(path.join(fixture.workspace, "core", "active")), "releases/1.2.3");
  assert.equal(JSON.parse(await readFile(path.join(fixture.workspace, "core", "releases", "1.2.3", ".wpsc-staged.json"), "utf8")).version, "1.2.3");
  assert.equal(JSON.parse(await readFile(path.join(fixture.workspace, "config", "wpsc.json"), "utf8")).product.version, "1.2.3");
  assert.deepEqual((await repository.readRegistry()).sites, []);
});

test("C042 preserves Site state, credentials, public output and existing mutable data", async () => {
  const fixture = await verifiedFixture();
  const sentinels = { "sites/company/site.json": "site-state", "sites/company/credentials.json": "credential-state", "public/index.html": "public-output", "storage/data.db": "database-state" };
  for (const [relative, value] of Object.entries(sentinels)) { await mkdir(path.dirname(path.join(fixture.workspace, relative)), { recursive: true }); await writeFile(path.join(fixture.workspace, relative), value); }
  const service = createProductCoreBootstrapService({ repository: createSiteRepository({ workspaceDir: fixture.workspace }), workspace: fixture.workspace });
  assert.equal((await service.bootstrap({ extractedPath: fixture.extracted, verified: fixture.verified })).ok, true);
  for (const [relative, value] of Object.entries(sentinels)) assert.equal(await readFile(path.join(fixture.workspace, relative), "utf8"), value);
  assert.equal((await service.bootstrap({ extractedPath: fixture.extracted, verified: fixture.verified })).ok, true);
  for (const [relative, value] of Object.entries(sentinels)) assert.equal(await readFile(path.join(fixture.workspace, relative), "utf8"), value);
});

test("C042 rejects unverified packages and a conflicting active Core", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "wpsc-c042-reject-"));
  const service = createProductCoreBootstrapService({ repository: createSiteRepository({ workspaceDir: workspace }), workspace });
  assert.equal((await service.bootstrap({ verified: { accepted: false } })).diagnostics.errors[0].code, "installation.bootstrap.package_unverified");
  const fixture = await verifiedFixture(workspace);
  await mkdir(path.join(workspace, "core", "releases", "9.9.9"), { recursive: true });
  await symlink("releases/9.9.9", path.join(workspace, "core", "active"));
  const conflict = await service.bootstrap({ extractedPath: fixture.extracted, verified: fixture.verified });
  assert.equal(conflict.diagnostics.errors[0].code, "installation.bootstrap.active_exists");
  assert.equal(await readlink(path.join(workspace, "core", "active")), "releases/9.9.9");
});

test("C042 active-pointer failure never publishes a partial pointer", async () => {
  const fixture = await verifiedFixture();
  const service = createProductCoreBootstrapService({ renamePointer: async () => { throw new Error("simulated pointer failure"); }, repository: createSiteRepository({ workspaceDir: fixture.workspace }), workspace: fixture.workspace });
  const result = await service.bootstrap({ extractedPath: fixture.extracted, verified: fixture.verified });
  assert.equal(result.ok, false);
  await assert.rejects(() => readlink(path.join(fixture.workspace, "core", "active")));
  await assert.rejects(() => readlink(path.join(fixture.workspace, "core", `active.${process.pid}.tmp`)));
  assert.equal(await readFile(path.join(fixture.workspace, "core", "releases", "1.2.3", "framework", "entry.mjs"), "utf8"), "export default 'core';\n");
});

async function verifiedFixture(existingWorkspace = null) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c042-fixture-"));
  const workspace = existingWorkspace ?? path.join(root, "workspace");
  const source = path.join(root, "source");
  await mkdir(path.join(source, "framework"), { recursive: true });
  await writeFile(path.join(source, "framework", "entry.mjs"), "export default 'core';\n");
  const evidence = createProductionDependencyEvidence({ features: { core: { entrypoints: ["framework/entry.mjs"] } }, modules: { "framework/entry.mjs": {} } });
  const keys = generateKeyPairSync("ed25519");
  const packageDir = path.join(root, "package");
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence, sourceDir: source, targetDir: packageDir, version: "1.2.3" });
  const verifier = createProductionPackageVerifier({ architectureVersion: "2.02", nodeVersion: "26.3.1", runtimeVersion: "1.0" });
  const verified = await verifier.verifyPackage({ packageDir, publicKey: keys.publicKey });
  const extracted = path.join(root, "verified-extracted");
  assert.equal((await verifier.extract({ packageDir, publicKey: keys.publicKey, targetDir: extracted })).ok, true);
  return { extracted, verified, workspace };
}
