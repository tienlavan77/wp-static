import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGlobalWpscCommandService, createInstallationMaintenanceService, createNginxInstaller, createSystemdRuntimeInstaller } from "../framework/src/index.js";

test("C046 second install is idempotent and preserves protected state", async () => {
  const fixture = await maintenanceFixture();
  const service = createInstallationMaintenanceService({ handlers: fixture.handlers });
  const input = fixture.input("REINSTALL");
  const first = await service.run(input);
  const ownedAfterFirst = await ownedSnapshot(fixture);
  const second = await service.run(input);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(await ownedSnapshot(fixture), ownedAfterFirst);
  await assertProtected(fixture);
});

test("C046 repair restores only missing Installer-owned infrastructure", async () => {
  const fixture = await maintenanceFixture();
  const service = createInstallationMaintenanceService({ handlers: fixture.handlers });
  await service.run(fixture.input("REINSTALL"));
  await rm(fixture.command, { force: true });
  await rm(fixture.unit, { force: true });
  await rm(fixture.nginxConfig, { force: true });
  await rm(fixture.nginxEnabled, { force: true });
  const repaired = await service.run(fixture.input("REPAIR"));
  assert.equal(repaired.ok, true);
  for (const file of [fixture.command, fixture.unit, fixture.nginxConfig]) assert.equal(typeof await readFile(file, "utf8"), "string");
  await assertProtected(fixture);
});

test("C046 dry-run performs zero mutation and invokes no privileged handler", async () => {
  const fixture = await maintenanceFixture();
  let calls = 0;
  const handlers = Object.fromEntries(Object.entries(fixture.handlers).map(([type, handler]) => [type, async (args) => { calls += 1; return handler(args); }]));
  const before = await treeSnapshot(fixture.workspace);
  const result = await createInstallationMaintenanceService({ handlers }).run({ ...fixture.input("REINSTALL"), dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(calls, 0);
  assert.equal(await treeSnapshot(fixture.workspace), before);
});

test("C046 failure stops execution, preserves protected state and succeeds on retry", async () => {
  const fixture = await maintenanceFixture();
  let fail = true;
  const handlers = { ...fixture.handlers, "install-systemd": async (args) => { if (fail) throw new Error("simulated repair failure"); return fixture.handlers["install-systemd"](args); } };
  const service = createInstallationMaintenanceService({ handlers });
  const failed = await service.run(fixture.input("REPAIR"));
  assert.equal(failed.ok, false);
  await assertProtected(fixture);
  fail = false;
  assert.equal((await service.run(fixture.input("REPAIR"))).ok, true);
  await assertProtected(fixture);
});

async function maintenanceFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c046-"));
  const workspace = path.join(root, "workspace");
  const command = path.join(root, "usr-local-bin", "wpsc");
  const unitDirectory = path.join(root, "systemd");
  const available = path.join(root, "nginx", "sites-available");
  const enabled = path.join(root, "nginx", "sites-enabled");
  const unit = path.join(unitDirectory, "wpsc-runtime-production.service");
  const nginxConfig = path.join(available, "wpsc-production-shop.example.com.conf");
  const nginxEnabled = path.join(enabled, "wpsc-production-shop.example.com.conf");
  const sentinels = { "config/runtime.env": "runtime-secret", "config/wpsc.json": "product-config", "sites/company/credentials.json": "credential-value", "sites/company/site.json": "site-state", "public/index.html": "public-output", "storage/data.db": "database", "core/releases/1.0.0/version": "core-version" };
  for (const [relative, value] of Object.entries(sentinels)) { await mkdir(path.dirname(path.join(workspace, relative)), { recursive: true }); await writeFile(path.join(workspace, relative), value); }
  await mkdir(path.join(workspace, "core"), { recursive: true });
  await symlink("releases/1.0.0", path.join(workspace, "core", "active"));
  const registry = { defaultInstallation: "production", installations: { production: { workspace } }, revision: 1, schema: "wpsc.installation-registry", schemaVersion: 1 };
  const globalCommand = createGlobalWpscCommandService({ commandPath: command });
  const systemd = createSystemdRuntimeInstaller({ probe: async () => ({ ok: true }), systemd: { daemonReload: async () => {}, disable: async () => {}, enable: async () => {}, isActive: async () => true, restart: async () => {} }, unitDirectory });
  const nginx = createNginxInstaller({ availableDirectory: available, enabledDirectory: enabled, nginx: { reload: async () => {}, validate: async () => ({ ok: true }) } });
  const handlers = {
    "activate-nginx": () => nginx.install({ domain: "shop.example.com", installationId: "production", workspace }),
    "install-global-command": () => globalCommand.install({ registry }),
    "install-node": async () => { const file = path.join(workspace, "runtime", "node", "bin", "node"); await mkdir(path.dirname(file), { recursive: true }); try { await readFile(file); } catch { await writeFile(file, "certified-node"); } },
    "install-systemd": () => systemd.install({ installationId: "production", workspace }),
    "prepare-directories": async () => mkdir(path.join(workspace, "storage", "installer"), { recursive: true })
  };
  return { available, command, enabled, handlers, input: (mode) => ({ context: { domain: "shop.example.com", registry }, installationId: "production", mode, workspace }), nginxConfig, nginxEnabled, root, sentinels, unit, workspace };
}

async function assertProtected(fixture) { for (const [relative, value] of Object.entries(fixture.sentinels)) assert.equal(await readFile(path.join(fixture.workspace, relative), "utf8"), value); assert.equal(await (await import("node:fs/promises")).readlink(path.join(fixture.workspace, "core", "active")), "releases/1.0.0"); }
async function ownedSnapshot(fixture) { return Promise.all([fixture.command, fixture.unit, fixture.nginxConfig].map((file) => readFile(file, "utf8"))); }
async function treeSnapshot(root) { const { createHash } = await import("node:crypto"); const walk = async (directory) => { const entries = []; for (const name of (await (await import("node:fs/promises")).readdir(directory)).sort()) { const file = path.join(directory, name); const metadata = await (await import("node:fs/promises")).lstat(file); entries.push(metadata.isDirectory() ? [name, await walk(file)] : metadata.isSymbolicLink() ? [name, await (await import("node:fs/promises")).readlink(file)] : [name, await readFile(file, "utf8")]); } return entries; }; return createHash("sha256").update(JSON.stringify(await walk(root))).digest("hex"); }
