import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallationLock, {
  INSTALLATION_LOCK_VERSION
} from "../src/release/createInstallationLock.js";

async function fixtureDir() {
  return mkdtemp(path.join(tmpdir(), "wpsc-install-lock-"));
}

test("createInstallationLock reports unlocked installations", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  const state = await lock.read();

  assert.equal(lock.version, INSTALLATION_LOCK_VERSION);
  assert.equal(state.installed, false);
  assert.equal(state.exists, false);
  assert.equal(await lock.isInstalled(), false);
});

test("createInstallationLock creates and reads installation lock", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  const created = await lock.create({
    buildId: "build-001",
    installedAt: "2026-07-26T00:00:00.000Z"
  });
  const state = await lock.read();

  assert.equal(created.installed, true);
  assert.equal(created.version, INSTALLATION_LOCK_VERSION);
  assert.equal(state.buildId, "build-001");
  assert.equal(state.installedAt, "2026-07-26T00:00:00.000Z");
  assert.equal(await lock.isInstalled(), true);
});

test("createInstallationLock blocks repeated installation", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  await lock.create({
    installedAt: "2026-07-26T00:00:00.000Z"
  });

  await assert.rejects(
    () => lock.assertNotInstalled(),
    (error) => {
      assert.equal(error.code, "install.lock.exists");
      assert.match(error.message, /already installed/);
      return true;
    }
  );
});

test("createInstallationLock treats corrupt lock as installed", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  await writeFile(lock.lockPath, "{not-json", "utf8").catch(async (error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await lock.create({
      force: true
    });
    await writeFile(lock.lockPath, "{not-json", "utf8");
  });

  const state = await lock.read();

  assert.equal(state.corrupt, true);
  assert.equal(state.installed, true);
  assert.equal(state.diagnostics.errors[0].code, "install.lock.corrupt");
  await assert.rejects(() => lock.assertNotInstalled(), {
    code: "install.lock.corrupt"
  });
});

test("createInstallationLock recovery requires explicit confirmation", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  await lock.create({
    installedAt: "2026-07-26T00:00:00.000Z"
  });

  await assert.rejects(() => lock.recover(), {
    code: "install.recovery.confirmation_required"
  });
  assert.equal((await lock.read()).installed, true);
});

test("createInstallationLock recovery archives lock instead of deleting it", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  await lock.create({
    buildId: "build-001",
    installedAt: "2026-07-26T00:00:00.000Z"
  });
  const result = await lock.recover({
    confirmed: true,
    reason: "broken-install",
    recoveredAt: "2026-07-26T01:00:00.000Z"
  });
  const archived = JSON.parse(await readFile(result.archivedPath, "utf8"));
  const state = await lock.read();

  assert.equal(result.ok, true);
  assert.equal(result.action, "archived-lock");
  assert.equal(result.reason, "broken-install");
  assert.equal(archived.buildId, "build-001");
  assert.equal(state.installed, false);
  assert.equal(state.exists, false);
});

test("createInstallationLock recovery is a no-op when no lock exists", async () => {
  const releaseDir = await fixtureDir();
  const lock = createInstallationLock({
    releaseDir
  });

  const result = await lock.recover({
    confirmed: true,
    reason: "no-lock"
  });

  assert.equal(result.ok, true);
  assert.equal(result.action, "none");
  assert.equal(result.archivedPath, null);
});
