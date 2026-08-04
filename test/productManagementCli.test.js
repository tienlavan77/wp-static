import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductManagementCli from "../framework/src/cli/createProductManagementCli.js";

test("Product CLI delegates stable commands to injected Product services", async () => {
  const cli = createProductManagementCli({
    backup: { list: async (siteId) => ({ backups: [{ backupId: `${siteId}-backup`, createdAt: "now" }], ok: true }) },
    deployment: { status: async (siteId) => ({ deployments: [{ artifactId: `${siteId}-artifact`, deploymentId: "deploy", state: "deployed" }], ok: true }) },
    operations: { inspect: async (siteId) => ({ ok: true, site: { id: siteId, name: "Alpha", status: "active" } }), list: async () => ({ ok: true, sites: [{ id: "alpha", name: "Alpha", status: "active" }] }) },
    product: { productId: "wpsc" }, registry: { read: async () => ({ sites: [] }) }, runtime: { state: () => ({ readiness: "ready" }) }
  });
  assert.match((await cli.run(["site", "list"])).output, /alpha/);
  assert.match((await cli.run(["backup", "list", "alpha", "--json"])).output, /alpha-backup/);
  assert.equal((await cli.run(["site", "inspect"])).code, 2);
});

test("Product CLI exposes the complete Core Update command surface", async () => {
  const update = { check: async () => ({ ok: true, status: "UP_TO_DATE" }), history: async () => ({ history: [], ok: true }), plan: async () => ({ ok: true, plan: {} }), run: async () => ({ ok: true }), status: async () => ({ ok: true, update: {} }) };
  const cli = createProductManagementCli({ backup: { list: async () => ({}) }, deployment: { status: async () => ({}) }, operations: { list: async () => ({}), inspect: async () => ({}) }, registry: { read: async () => ({}) }, update });
  for (const command of [["update", "check"], ["update", "plan"], ["update"], ["update", "status"], ["update", "history"]]) assert.equal((await cli.run(command)).code, 0);
});

test("C037 root CLI removes global project arguments before bare update dispatch", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-update-cli-project-"));
  try {
    await mkdir(path.join(workspaceDir, "sites"), { recursive: true });
    const result = spawnSync(process.execPath, ["framework/src/cli/index.js", "update", "--json", "--project", workspaceDir], { cwd: path.resolve("."), encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /Unknown Product command/);
    assert.match(result.stdout, /core_update\.plan\.release\.unavailable/);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
