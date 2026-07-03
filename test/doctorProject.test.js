import assert from "node:assert/strict";
import test from "node:test";
import doctorProject from "../src/core/doctorProject.js";

test("doctorProject reports healthy example project", async () => {
  const checks = await doctorProject("examples/basic-shop");

  assert.equal(checks.every((check) => check.ok), true);
  assert.equal(checks.some((check) => check.name === "Config file"), true);
});
