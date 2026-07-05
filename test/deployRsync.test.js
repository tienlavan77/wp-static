import assert from "node:assert/strict";
import test from "node:test";
import createRsyncDeployPlan from "../src/deploy/createRsyncDeployPlan.js";

test("createRsyncDeployPlan builds a safe rsync command", () => {
  const plan = createRsyncDeployPlan({
    dryRun: true,
    excludes: ["private"],
    sourceDir: "examples/basic-shop/dist",
    target: "tienlavan@192.168.1.181:/home/data/sites/wp-static/examples/basic-shop/dist/"
  });

  assert.equal(plan.command, "rsync");
  assert.equal(plan.args.includes("--dry-run"), true);
  assert.equal(plan.args.includes("--delete"), true);
  assert.equal(plan.args.includes("--exclude"), true);
  assert.equal(plan.args.includes("private"), true);
  assert.equal(plan.args.at(-1), "tienlavan@192.168.1.181:/home/data/sites/wp-static/examples/basic-shop/dist/");
});

test("createRsyncDeployPlan requires a target", () => {
  assert.throws(() => createRsyncDeployPlan({
    sourceDir: "dist"
  }), /target/);
});
