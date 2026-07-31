import assert from "node:assert/strict";
import test from "node:test";
import {
  checkNodeVersion
} from "../framework/src/validation/checkEnvironment.js";
import {
  createError,
  createOk,
  createWarning,
  summarizeValidationResults
} from "../framework/src/validation/createValidationResult.js";

test("validation result model preserves status and legacy ok field", () => {
  const ok = createOk("Node", "v26.0.0");
  const warning = createWarning("PHP", "not found", { fix: "Install PHP." });
  const error = createError("Config", "missing", { fix: "Create config." });

  assert.equal(ok.status, "ok");
  assert.equal(ok.ok, true);
  assert.equal(warning.status, "warning");
  assert.equal(warning.ok, true);
  assert.equal(error.status, "error");
  assert.equal(error.ok, false);
  assert.equal(error.fix, "Create config.");
});

test("summarizeValidationResults counts ok warnings and errors", () => {
  const summary = summarizeValidationResults([
    createOk("A", "ok"),
    createWarning("B", "warn"),
    createError("C", "error")
  ]);

  assert.deepEqual(summary, {
    error: 1,
    ok: 1,
    total: 3,
    warning: 1
  });
});

test("checkNodeVersion reports actionable error for old Node versions", async () => {
  const result = await checkNodeVersion({
    minimumMajor: 20,
    version: "v18.0.0"
  });

  assert.equal(result.status, "error");
  assert.match(result.fix, /Install Node\.js 20/);
});
