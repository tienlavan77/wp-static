#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, readlink, rename, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const workspaceDir = path.resolve(new URL("..", import.meta.url).pathname);
const nodePath = path.join(workspaceDir, "runtime/node/bin/node");
const serviceName = "wpsc-runtime.service";
const generatedUnit = path.join(workspaceDir, "deploy/systemd/wpsc-runtime.service");
const installedUnit = `/etc/systemd/system/${serviceName}`;
const evidenceFile = path.join(workspaceDir, "storage/updates/c037-vps-evidence.json");

if (!process.argv.includes("--confirm") || process.getuid?.() !== 0) {
  throw new Error(`Run with: sudo ${nodePath} scripts/c037-vps-acceptance.js --confirm`);
}

await assertPrerequisites();
await mkdir(path.dirname(evidenceFile), { recursive: true });
prepareUpdateOwnership();
const baseline = await snapshot();
await backupIfAbsent(installedUnit, path.join(workspaceDir, "storage/updates/c037-systemd-before.service"));
await copyFile(generatedUnit, installedUnit);
command("systemctl", ["daemon-reload"]);
command("systemctl", ["restart", serviceName]);
await assertRuntimeHealthy("1.0.0");

const scenarios = [];
scenarios.push(await runScenario("1.0.0", "1.1.0", "COMPLETED"));
scenarios.push(await runScenario("1.1.0", "1.2.0", "ROLLED_BACK"));
scenarios.push(await runScenario("1.1.0", "1.2.1", "COMPLETED"));

const after = await snapshot();
for (const key of ["siteConfiguration", "credentials", "publicOutput"]) {
  if (baseline[key] !== after[key]) throw new Error(`C037 isolation failed: ${key} changed.`);
}

const evidence = {
  after,
  baseline,
  completedAt: new Date().toISOString(),
  nodeVersion: command(nodePath, ["--version"]).stdout.trim(),
  scenarios,
  schema: "wpsc.c037-vps-acceptance",
  schemaVersion: 1,
  service: serviceName,
  status: "PASS"
};
await atomicJson(evidenceFile, evidence);
console.log(JSON.stringify(evidence, null, 2));

async function runScenario(currentVersion, targetVersion, expectedState) {
  if (await readlink(path.join(workspaceDir, "core/active")) !== `releases/${currentVersion}`) throw new Error(`Expected active Core ${currentVersion}.`);
  await selectRelease(targetVersion);
  const check = productCommand(["update", "check", "--json"]);
  const plan = productCommand(["update", "plan", "--json"]);
  const update = productCommand(["update", "--json"], expectedState === "ROLLED_BACK" ? 1 : 0);
  const status = productCommand(["update", "status", "--json"]);
  const history = productCommand(["update", "history", "--json"]);
  if (status.update?.state !== expectedState) throw new Error(`Expected lifecycle ${expectedState}, received ${status.update?.state}.`);
  const expectedActive = expectedState === "ROLLED_BACK" ? currentVersion : targetVersion;
  if (await readlink(path.join(workspaceDir, "core/active")) !== `releases/${expectedActive}`) throw new Error(`Active Core does not match ${expectedActive}.`);
  command("systemctl", ["restart", serviceName]);
  await assertRuntimeHealthy(expectedActive);
  return { activeVersion: expectedActive, check: check.status, historyEvents: history.history?.length ?? 0, lifecycle: status.update.state, planVersion: plan.plan?.package?.version ?? null, targetVersion, updateOk: update.ok === true };
}

async function selectRelease(version) {
  const packageId = `wpsc-${version}`;
  const release = { architecture: "2.02", packageId, product: "wpsc", runtime: "1.0", version };
  await lstat(path.join(workspaceDir, "storage/core-releases", packageId, "manifest.json"));
  await atomicJson(path.join(workspaceDir, "storage/core-releases/releases.json"), [release]);
}

function productCommand(args, expectedCode = 0) {
  const activeCli = path.join(workspaceDir, "core/active/framework/src/cli/index.js");
  const result = command("runuser", ["-u", "www-data", "--", nodePath, activeCli, ...args, "--project", workspaceDir], expectedCode);
  return JSON.parse(result.stdout);
}

async function assertRuntimeHealthy(version) {
  if (command("systemctl", ["is-active", serviceName]).stdout.trim() !== "active") throw new Error("Runtime service is not active.");
  const active = await readlink(path.join(workspaceDir, "core/active"));
  if (active !== `releases/${version}`) throw new Error(`Runtime active pointer does not match ${version}.`);
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:8787/", { headers: { host: "192.168.1.181:8787" } });
      if (response.status < 500) return;
      lastError = new Error(`Runtime health request failed: ${response.status}.`);
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Runtime did not become ready within 15 seconds: ${lastError?.message ?? "unknown error"}`);
}

async function assertPrerequisites() {
  if (!process.versions.node.startsWith("20.")) throw new Error(`C037 requires Node 20, received ${process.versions.node}.`);
  for (const target of [nodePath, generatedUnit, path.join(workspaceDir, "config/wpsc.json"), path.join(workspaceDir, "config/core-update-public.pem"), path.join(workspaceDir, "core/active")]) await lstat(target);
  const unit = await readFile(generatedUnit, "utf8");
  if (!unit.includes("core/active/framework/src/cli/index.js") || !unit.includes(nodePath)) throw new Error("Generated systemd unit does not use the active Core and Node 20.");
}

async function snapshot() {
  return {
    credentials: await hashGroup([path.join(workspaceDir, "config/runtime.env")], [path.join(workspaceDir, "sites")], (file) => /credentials/i.test(file)),
    publicOutput: await hashGroup([], [path.join(workspaceDir, "sites")], (file) => file.includes(`${path.sep}public${path.sep}`)),
    siteConfiguration: await hashGroup([], [path.join(workspaceDir, "sites")], (file) => file.includes(`${path.sep}config${path.sep}`) && !/credentials/i.test(file) && !file.endsWith(`${path.sep}source.json`))
  };
}

async function hashGroup(files, roots, accept) {
  const selected = [...files];
  for (const root of roots) await collect(root, selected, accept);
  const hash = createHash("sha256");
  for (const file of selected.sort()) { hash.update(path.relative(workspaceDir, file)); hash.update(await readFile(file)); }
  return hash.digest("hex");
}

async function collect(directory, output, accept) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(target, output, accept);
    else if (entry.isFile() && accept(target)) output.push(target);
  }
}

function command(executable, args, expectedCode = 0) {
  const result = spawnSync(executable, args, { cwd: workspaceDir, encoding: "utf8" });
  if (result.status !== expectedCode) throw new Error(`${executable} ${args.join(" ")} exited ${result.status}: ${result.stderr || result.stdout}`);
  return result;
}

function prepareUpdateOwnership() {
  command("chown", ["-R", "www-data:www-data", path.join(workspaceDir, "core"), path.join(workspaceDir, "storage/updates")]);
  command("chown", ["www-data:www-data", path.join(workspaceDir, "config/wpsc.json"), path.join(workspaceDir, "config/installation.json")]);
}

async function atomicJson(target, value) {
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

async function backupIfAbsent(source, target) {
  try { await copyFile(source, target, constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
