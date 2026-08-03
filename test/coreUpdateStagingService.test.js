import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createCoreUpdateStagingService from "../framework/src/product/update/createCoreUpdateStagingService.js";

test("Core Update staging installs an isolated release without changing active Core", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-stage-"));
  const packageDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-package-"));
  try {
    await mkdir(path.join(workspaceDir, "core"), { recursive: true }); await writeFile(path.join(workspaceDir, "core/active"), "releases/1.0.0"); await writeFile(path.join(packageDir, "core.js"), "new core");
    const result = await createCoreUpdateStagingService({ workspaceDir }).stage({ packageDir, version: "1.1.0" });
    assert.equal(result.staged, true); assert.equal(await readFile(path.join(workspaceDir, "core/active"), "utf8"), "releases/1.0.0"); assert.match(await readFile(path.join(workspaceDir, "core/releases/1.1.0/core.js"), "utf8"), /new core/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); await rm(packageDir, { force: true, recursive: true }); }
});

test("Core Update staging rejects an existing immutable release", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-stage-existing-")); const packageDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-package-existing-"));
  try { await mkdir(path.join(workspaceDir, "core/releases/1.1.0"), { recursive: true }); assert.equal((await createCoreUpdateStagingService({ workspaceDir }).stage({ packageDir, version: "1.1.0" })).ok, false); } finally { await rm(workspaceDir, { force: true, recursive: true }); await rm(packageDir, { force: true, recursive: true }); }
});

test("Core Update staging cleans a failed copy and never changes active Core", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-stage-fail-"));
  try { await mkdir(path.join(workspaceDir, "core"), { recursive: true }); await writeFile(path.join(workspaceDir, "core/active"), "releases/1.0.0"); const result = await createCoreUpdateStagingService({ workspaceDir }).stage({ packageDir: path.join(workspaceDir, "missing"), version: "1.1.0" }); assert.equal(result.ok, false); await assert.rejects(access(path.join(workspaceDir, "core/releases/1.1.0"))); assert.equal(await readFile(path.join(workspaceDir, "core/active"), "utf8"), "releases/1.0.0"); } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update staging inspection rejects an incomplete release after restart", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-stage-inspect-"));
  try { await mkdir(path.join(workspaceDir, "core/releases/1.1.0"), { recursive: true }); const restarted = createCoreUpdateStagingService({ workspaceDir }); assert.equal((await restarted.inspect("1.1.0")).ok, false); await writeFile(path.join(workspaceDir, "core/releases/1.1.0/.wpsc-staged.json"), '{"version":"1.1.0"}'); assert.equal((await restarted.inspect("1.1.0")).staged, true); } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
