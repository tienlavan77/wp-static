import assert from "node:assert/strict";
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
