import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createContentTransitionPlan from "../framework/src/build/createContentTransitionPlan.js";
import writeRedirectOutputs from "../framework/src/builder/writeRedirectOutputs.js";

test("Content transition plan forces a full build for delete and unpublish", () => {
  assert.equal(createContentTransitionPlan([{ changeType: "delete", entityType: "product" }]).forceFullBuild, true);
  assert.equal(createContentTransitionPlan([{ changeType: "unpublish", entityType: "page" }]).reason, "destructive-source-change");
});

test("Content transition plan creates a permanent redirect for a rename", async () => {
  const plan = createContentTransitionPlan([{ changeType: "update", previousSlug: "old-product", slug: "new-product" }]);
  assert.equal(plan.forceFullBuild, true);
  assert.deepEqual(plan.redirects, [{ from: "/old-product", status: 301, to: "/new-product" }]);
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-redirect-"));
  try {
    await writeRedirectOutputs(plan.redirects, { outputDir });
    assert.match(await readFile(path.join(outputDir, "old-product", "index.html"), "utf8"), /new-product/);
  } finally { await rm(outputDir, { force: true, recursive: true }); }
});
