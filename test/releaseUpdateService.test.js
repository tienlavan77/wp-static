import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readlink, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createReleaseMetadataService, createReleaseUpdateService } from "../framework/src/index.js";

const digest = "a".repeat(64);

test("C049 discovers only a newer trusted compatible release without mutation", async () => {
  const fixture = await workspace();
  const metadata = createReleaseMetadataService({ allowedHosts: ["releases.example.test"], nodeMajor: 26, source: { list: async () => [release("1.0.0"), release("1.1.0"), release("1.2.0", 27)] }, workspace: fixture.workspace });
  const result = await metadata.check({ installationId: "production" });
  assert.equal(result.ok, true);
  assert.equal(result.currentVersion, "1.0.0");
  assert.equal(result.available.version, "1.1.0");
  assert.equal(await readlink(fixture.active), "releases/1.0.0");
});

test("C049 performs a fenced N to N+1 update, preserves protected state and retains the previous release", async () => {
  const fixture = await workspace();
  const evidence = [];
  let stagedAgainst;
  const service = updateService(fixture, {
    activation: { activate: async (version) => { await (await import("node:fs/promises")).rm(fixture.active); await symlink(`releases/${version}`, fixture.active); return { ok: true }; } },
    evidenceStore: { write: async (value) => { evidence.push(value); return value; } },
    staging: { stage: async ({ version }) => { stagedAgainst = await readlink(fixture.active); await mkdir(path.join(fixture.workspace, "core", "releases", version)); return { ok: true }; } }
  });
  const result = await service.update({ ownerId: "owner", packageDir: path.join(fixture.workspace, "packages", "1.1.0"), publicKey: "public" });
  assert.equal(result.ok, true);
  assert.equal(result.finalVersion, "1.1.0");
  assert.equal(stagedAgainst, "releases/1.0.0");
  assert.equal(await readlink(fixture.active), "releases/1.1.0");
  await assert.doesNotReject(() => lstat(path.join(fixture.workspace, "core", "releases", "1.0.0")));
  assert.equal(evidence[0].status, "PASS");
  assert.equal(evidence[0].currentVersion, "1.0.0");
  assert.equal(evidence[0].targetVersion, "1.1.0");
});

test("C049 rejects a failed C041 verification before activation", async () => {
  const fixture = await workspace();
  const service = updateService(fixture, { verifier: { verifyPackage: async () => ({ accepted: false, ok: false }) } });
  const result = await service.update({ ownerId: "owner", packageDir: path.join(fixture.workspace, "packages", "1.1.0"), publicKey: "public" });
  assert.equal(result.ok, false);
  assert.equal(await readlink(fixture.active), "releases/1.0.0");
});

function updateService(fixture, overrides = {}) {
  const metadata = createReleaseMetadataService({ allowedHosts: ["releases.example.test"], nodeMajor: 26, source: { list: async () => [release("1.1.0")] }, workspace: fixture.workspace });
  return createReleaseUpdateService({
    acquisition: { acquire: async () => ({ ok: true, packageDir: path.join(fixture.workspace, "packages", "1.1.0") }) },
    activation: { activate: async () => ({ ok: true }) },
    health: { inspect: async () => ({ state: "HEALTHY" }) },
    installationId: "production",
    metadata,
    runtime: { restart: async () => ({ ok: true }) },
    snapshot: async () => ({ credentials: "same", database: "same", publicOutput: "same", siteConfiguration: "same" }),
    staging: { stage: async () => ({ ok: true }) },
    verifier: { verifyPackage: async () => ({ accepted: true, ok: true }) },
    workspace: fixture.workspace,
    ...overrides
  });
}

async function workspace() { const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c049-")); const active = path.join(root, "core", "active"); await mkdir(path.join(root, "core", "releases", "1.0.0"), { recursive: true }); await symlink("releases/1.0.0", active); return { active, workspace: root }; }
function release(version, minNodeMajor = 26) { return { minNodeMajor, productId: "wpsc", sha256: digest, size: 100, url: `https://releases.example.test/wpsc-${version}.bundle.json`, version }; }
