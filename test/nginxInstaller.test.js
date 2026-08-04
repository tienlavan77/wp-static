import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createNginxInstaller } from "../framework/src/index.js";

test("C045 generates validated domain routing and atomically activates managed config", async () => {
  const fixture = await nginxFixture();
  const calls = [];
  const nginx = { reload: async () => { calls.push("reload"); }, validate: async (candidate) => { calls.push("validate"); const content = await readFile(candidate, "utf8"); return { ok: content.includes("server_name shop.example.com www.shop.example.com") && content.includes("proxy_pass http://127.0.0.1:8787") }; } };
  const installer = createNginxInstaller({ availableDirectory: fixture.available, enabledDirectory: fixture.enabled, nginx });
  const result = await installer.install({ domain: "shop.example.com", installationId: "production", publicRoot: path.join(fixture.workspace, "sites", "shop", "public"), workspace: fixture.workspace });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["validate", "reload"]);
  assert.match(await readFile(result.config.availablePath, "utf8"), /^# WPSC-MANAGED/);
  assert.equal(await readlink(result.config.enabledPath), path.relative(fixture.enabled, result.config.availablePath));
});

test("C045 invalid candidate never replaces the active managed config", async () => {
  const fixture = await nginxFixture();
  const installer = createNginxInstaller({ availableDirectory: fixture.available, enabledDirectory: fixture.enabled, nginx: { reload: async () => {}, validate: async () => ({ message: "nginx -t failed", ok: false }) } });
  const rendered = await installer.render({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  const previous = "# WPSC-MANAGED installation=production domain=shop.example.com\nserver { return 200; }\n";
  await mkdir(path.dirname(rendered.availablePath), { recursive: true });
  await writeFile(rendered.availablePath, previous);
  await mkdir(path.dirname(rendered.enabledPath), { recursive: true });
  const { symlink } = await import("node:fs/promises");
  await symlink(path.relative(fixture.enabled, rendered.availablePath), rendered.enabledPath);
  const result = await installer.install({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  assert.equal(result.ok, false);
  assert.equal(await readFile(rendered.availablePath, "utf8"), previous);
  assert.equal(await readlink(rendered.enabledPath), path.relative(fixture.enabled, rendered.availablePath));
  assert.equal(await readFile(result.backupPath, "utf8"), previous);
});

test("C045 reload failure restores the previous config and enabled link", async () => {
  const fixture = await nginxFixture();
  let reloads = 0;
  const installer = createNginxInstaller({ availableDirectory: fixture.available, enabledDirectory: fixture.enabled, nginx: { reload: async () => { reloads += 1; if (reloads === 1) throw new Error("reload failed"); }, validate: async () => ({ ok: true }) } });
  const rendered = await installer.render({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  const previous = "# WPSC-MANAGED installation=production domain=shop.example.com\nserver { return 204; }\n";
  await mkdir(path.dirname(rendered.availablePath), { recursive: true });
  await writeFile(rendered.availablePath, previous);
  await mkdir(path.dirname(rendered.enabledPath), { recursive: true });
  const { symlink } = await import("node:fs/promises");
  const link = path.relative(fixture.enabled, rendered.availablePath);
  await symlink(link, rendered.enabledPath);
  const result = await installer.install({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  assert.equal(result.ok, false);
  assert.equal(await readFile(rendered.availablePath, "utf8"), previous);
  assert.equal(await readlink(rendered.enabledPath), link);
  assert.equal(reloads, 2);
});

test("C045 refuses to overwrite operator-owned Nginx configuration", async () => {
  const fixture = await nginxFixture();
  const installer = createNginxInstaller({ availableDirectory: fixture.available, enabledDirectory: fixture.enabled, nginx: { reload: async () => { throw new Error("must not reload"); }, validate: async () => { throw new Error("must not validate"); } } });
  const rendered = await installer.render({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  await mkdir(path.dirname(rendered.availablePath), { recursive: true });
  await writeFile(rendered.availablePath, "# operator config\nserver {}\n");
  const result = await installer.install({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  assert.equal(result.diagnostics.errors[0].code, "installation.nginx.operator_owned");
  assert.equal(await readFile(rendered.availablePath, "utf8"), "# operator config\nserver {}\n");
});

test("C045 multiple Installations and domains use independent managed identities", async () => {
  const fixture = await nginxFixture();
  const installer = createNginxInstaller({ availableDirectory: fixture.available, enabledDirectory: fixture.enabled, nginx: { reload: async () => {}, validate: async () => ({ ok: true }) } });
  const production = await installer.install({ domain: "shop.example.com", installationId: "production", workspace: fixture.workspace });
  const staging = await installer.install({ domain: "stage.example.com", installationId: "staging", workspace: path.join(fixture.root, "staging") });
  assert.equal(production.ok, true);
  assert.equal(staging.ok, true);
  assert.notEqual(production.config.fileName, staging.config.fileName);
  assert.match(await readFile(production.config.availablePath, "utf8"), /installation=production/);
  assert.match(await readFile(staging.config.availablePath, "utf8"), /installation=staging/);
});

async function nginxFixture() { const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c045-")); return { available: path.join(root, "nginx", "sites-available"), enabled: path.join(root, "nginx", "sites-enabled"), root, workspace: path.join(root, "production") }; }
