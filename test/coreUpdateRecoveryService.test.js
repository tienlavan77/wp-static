import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createCoreUpdateRecoveryService from "../framework/src/product/update/createCoreUpdateRecoveryService.js";

test("Core Update Recovery restores Core/config/checkpoints without Site credentials", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-recovery-"));
  try {
    await mkdir(path.join(workspaceDir, "config"), { recursive: true }); await mkdir(path.join(workspaceDir, "sites/a/config"), { recursive: true });
    await writeFile(path.join(workspaceDir, "config/wpsc.json"), '{"version":"1.0.0"}'); await writeFile(path.join(workspaceDir, "sites/a/config/credentials.json"), 'secret');
    const service = createCoreUpdateRecoveryService({ workspaceDir }); const recovery = await service.create({ recoveryId: "before" });
    assert.equal(recovery.recovery.files.some((file) => file.path === "sites/a/config/credentials.json"), false); await writeFile(path.join(workspaceDir, "config/wpsc.json"), '{"version":"broken"}'); await service.restore("before");
    assert.match(await readFile(path.join(workspaceDir, "config/wpsc.json"), "utf8"), /1.0.0/); assert.equal(await readFile(path.join(workspaceDir, "sites/a/config/credentials.json"), "utf8"), "secret");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update Recovery rejects a tampered or incomplete snapshot before partial restore", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-recovery-tamper-"));
  try {
    await mkdir(path.join(workspaceDir, "config"), { recursive: true });
    await mkdir(path.join(workspaceDir, "storage/migrations"), { recursive: true });
    await writeFile(path.join(workspaceDir, "config/wpsc.json"), '{"version":"old"}');
    await writeFile(path.join(workspaceDir, "storage/migrations/product.json"), '{"checkpoint":"old"}');
    const service = createCoreUpdateRecoveryService({ workspaceDir });
    await service.create({ recoveryId: "safe" });
    await writeFile(path.join(workspaceDir, "config/wpsc.json"), '{"version":"broken"}');
    await writeFile(path.join(workspaceDir, "storage/updates/recovery/safe/storage/migrations/product.json"), "tampered");
    await assert.rejects(service.restore("safe"), /integrity/);
    assert.match(await readFile(path.join(workspaceDir, "config/wpsc.json"), "utf8"), /broken/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update Recovery deterministically restores the active Core pointer", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-recovery-active-"));
  try {
    await mkdir(path.join(workspaceDir, "core"), { recursive: true });
    await writeFile(path.join(workspaceDir, "core/active"), "releases/1.0.0");
    const service = createCoreUpdateRecoveryService({ workspaceDir });
    await service.create({ recoveryId: "active-before" });
    await writeFile(path.join(workspaceDir, "core/active"), "releases/broken");
    await service.restore("active-before");
    assert.equal(await readFile(path.join(workspaceDir, "core/active"), "utf8"), "releases/1.0.0");
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});

test("Core Update Recovery keeps an existing valid recovery when new manifest persistence fails", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-recovery-atomic-"));
  try {
    await mkdir(path.join(workspaceDir, "config"), { recursive: true });
    await writeFile(path.join(workspaceDir, "config/wpsc.json"), '{"version":"old"}');
    const stable = createCoreUpdateRecoveryService({ workspaceDir });
    await stable.create({ recoveryId: "known-good" });
    const failing = createCoreUpdateRecoveryService({ workspaceDir, writeRecoveryManifest: async (target, record) => {
      await writeFile(`${target}.simulated.tmp`, JSON.stringify(record));
      throw new Error("simulated persistence failure after temporary manifest write");
    } });
    await assert.rejects(failing.create({ recoveryId: "partial" }), /simulated persistence failure/);
    await assert.rejects(access(path.join(workspaceDir, "storage/updates/recovery/partial/recovery.json")));
    await access(path.join(workspaceDir, "storage/updates/recovery/partial/recovery.json.simulated.tmp"));
    await writeFile(path.join(workspaceDir, "config/wpsc.json"), '{"version":"broken"}');
    await stable.restore("known-good");
    assert.match(await readFile(path.join(workspaceDir, "config/wpsc.json"), "utf8"), /old/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
