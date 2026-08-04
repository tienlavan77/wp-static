import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createGlobalWpscCommandService } from "../framework/src/index.js";

test("C043 global wpsc resolves default Installation Node and active Core CLI", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const result = await run(fixture.command, ["--version"]);
  assert.equal(result.code, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.installation, "production");
  assert.equal(output.node, path.join(fixture.production, "runtime", "node", "bin", "node"));
  assert.deepEqual(output.args, ["--version"]);
});

test("C043 forwards CLI arguments unchanged after the global Installation selector", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const args = ["--installation", "staging", "runtime:build", "--site", "company", "--json", "--project", "/srv/project with spaces"];
  const result = await run(fixture.command, args);
  assert.equal(result.code, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.installation, "staging");
  assert.deepEqual(output.args, args.slice(2));
});

test("C043 consumes only the launcher prefix selector and preserves later selector-like arguments", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const args = ["--installation", "staging", "--foo", "a b", "--path=/tmp/x y", "--", "--installation", "production", "--installation="];
  const output = JSON.parse((await run(fixture.command, args)).stdout);
  assert.equal(output.installation, "staging");
  assert.deepEqual(output.args, args.slice(2));
  assert.equal((await run(fixture.command, ["--installation"])).code, 2);
  assert.equal((await run(fixture.command, ["--installation=", "--version"])).code, 2);
});

test("C043 production and staging resolve independent Node/Core installations", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const production = JSON.parse((await run(fixture.command, ["--installation=production", "status"])).stdout);
  const staging = JSON.parse((await run(fixture.command, ["--installation=staging", "status"])).stdout);
  assert.equal(production.root, fixture.production);
  assert.equal(staging.root, fixture.staging);
  assert.notEqual(production.node, staging.node);
});

test("C043 requires explicit selection when Registry has no default", async () => {
  const fixture = await commandFixture({ defaultInstallation: null });
  const missing = await run(fixture.command, ["--version"]);
  assert.equal(missing.code, 2);
  assert.match(missing.stderr, /installation selection required/);
  assert.equal((await run(fixture.command, ["--installation", "production", "--version"])).code, 0);
});

test("C043 global command has no PATH or NVM runtime dependency", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const content = await readFile(fixture.command, "utf8");
  assert.equal(content.includes("nvm"), false);
  assert.equal(content.includes("env node"), false);
  const result = await run(fixture.command, ["doctor"], { PATH: "/nonexistent", NVM_DIR: "/missing" });
  assert.equal(result.code, 0);
});

test("C043 failed command replacement preserves the previous global launcher", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const before = await readFile(fixture.command, "utf8");
  const registry = { defaultInstallation: "staging", installations: { production: { workspace: fixture.production }, staging: { workspace: fixture.staging } }, revision: 2, schema: "wpsc.installation-registry", schemaVersion: 1 };
  const service = createGlobalWpscCommandService({ commandPath: fixture.command, renameCommand: async () => { throw new Error("simulated command activation failure"); } });
  await assert.rejects(() => service.install({ registry }), /simulated command activation failure/);
  assert.equal(await readFile(fixture.command, "utf8"), before);
  assert.equal(JSON.parse((await run(fixture.command, ["--version"])).stdout).installation, "production");
});

test("C043 safely renders hyphenated IDs and workspaces containing spaces, quotes and shell characters", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c043-shell-safe-"));
  const workspace = path.join(root, "path with spaces", "quote's $(not-executed) ; workspace");
  await installation(workspace);
  const command = path.join(root, "bin", "wpsc");
  const registry = { defaultInstallation: "staging-prod", installations: { "staging-prod": { workspace } }, revision: 1, schema: "wpsc.installation-registry", schemaVersion: 1 };
  const service = createGlobalWpscCommandService({ commandPath: command });
  await service.install({ registry });
  const output = JSON.parse((await run(command, ["--version"])).stdout);
  assert.equal(output.installation, "staging-prod");
  assert.equal(output.root, workspace);
  assert.equal((await readFile(command, "utf8")).includes("eval"), false);
  await assert.rejects(() => service.render({ registry: { ...registry, defaultInstallation: "bad;id", installations: { "bad;id": { workspace } } } }), /unsafe/);
});

test("C043 rejects Node and active Core paths that escape the selected Installation", async () => {
  const fixture = await commandFixture({ defaultInstallation: "production" });
  const node = path.join(fixture.production, "runtime", "node", "bin", "node");
  await rm(node);
  await symlink(process.execPath, node);
  const escapedNode = await run(fixture.command, ["--version"]);
  assert.equal(escapedNode.code, 1);
  assert.match(escapedNode.stderr, /Node must not be a symlink/);

  await rm(node);
  await writeNodeLauncher(node);
  const active = path.join(fixture.production, "core", "active");
  await rm(active, { force: true, recursive: true });
  await symlink(path.join(fixture.staging, "core", "active"), active);
  const escapedCore = await run(fixture.command, ["--version"]);
  assert.equal(escapedCore.code, 1);
  assert.match(escapedCore.stderr, /CLI escapes workspace/);
});

async function commandFixture({ defaultInstallation }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c043-"));
  const production = path.join(root, "production");
  const staging = path.join(root, "staging");
  for (const workspace of [production, staging]) await installation(workspace);
  const command = path.join(root, "bin", "wpsc");
  const registry = { defaultInstallation, installations: { production: { workspace: production }, staging: { workspace: staging } }, revision: 1, schema: "wpsc.installation-registry", schemaVersion: 1 };
  await createGlobalWpscCommandService({ commandPath: command }).install({ registry });
  return { command, production, staging };
}

async function installation(workspace) {
  const node = path.join(workspace, "runtime", "node", "bin", "node");
  const cli = path.join(workspace, "core", "active", "framework", "src", "cli", "index.js");
  await mkdir(path.dirname(node), { recursive: true });
  await writeNodeLauncher(node);
  await mkdir(path.dirname(cli), { recursive: true });
  await writeFile(cli, "process.stdout.write(JSON.stringify({args:process.argv.slice(2),installation:process.env.WPSC_INSTALLATION_ID,node:process.env.WPSC_INSTALLATION_NODE,root:process.env.WPSC_INSTALLATION_ROOT}));\n");
  await chmod(cli, 0o755);
}

async function writeNodeLauncher(node) {
  const quoted = `'${process.execPath.replaceAll("'", `'"'"'`)}'`;
  await writeFile(node, `#!/bin/sh\nexec ${quoted} "$@"\n`);
  await chmod(node, 0o755);
}

function run(command, args, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...environment } });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr, stdout }));
  });
}
