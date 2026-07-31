import assert from "node:assert/strict";
import test from "node:test";
import {
  createError,
  createOk,
  createWarning
} from "../framework/src/validation/createValidationResult.js";
import {
  formatValidationResults,
  groupByCategory
} from "../framework/src/validation/formatValidationResults.js";

test("formatValidationResults groups text output by category with fixes", () => {
  const output = formatValidationResults([
    createOk("Node.js", "v26", {
      category: "environment",
      summary: "Node.js v26 is supported."
    }),
    createWarning("PHP", "not found", {
      category: "environment",
      fix: "Install PHP.",
      summary: "PHP is not available."
    }),
    createError("Config file", "missing", {
      category: "configuration",
      fix: "Create wpsc.config.js.",
      summary: "Config file is missing."
    })
  ]);

  assert.match(output, /Environment:/);
  assert.match(output, /\[OK\] Node\.js/);
  assert.match(output, /\[WARNING\] PHP/);
  assert.match(output, /Fix: Install PHP\./);
  assert.match(output, /Configuration:/);
  assert.match(output, /\[ERROR\] Config file/);
  assert.match(output, /Summary: 1 OK, 1 warning, 1 error/);
});

test("formatValidationResults emits machine-readable JSON", () => {
  const output = formatValidationResults([
    createError("Node.js", "old", {
      category: "environment",
      fix: "Upgrade Node.js.",
      summary: "Node.js is too old."
    })
  ], {
    format: "json"
  });
  const payload = JSON.parse(output);

  assert.equal(payload.summary.error, 1);
  assert.equal(payload.results[0].status, "error");
  assert.equal(payload.results[0].fix, "Upgrade Node.js.");
});

test("groupByCategory keeps validation order within categories", () => {
  const groups = groupByCategory([
    createOk("A", "ok", { category: "environment" }),
    createOk("B", "ok", { category: "theme" }),
    createOk("C", "ok", { category: "environment" })
  ]);

  assert.deepEqual([...groups.keys()], ["environment", "theme"]);
  assert.deepEqual(groups.get("environment").map((check) => check.name), ["A", "C"]);
});
