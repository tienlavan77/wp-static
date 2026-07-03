import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("cli prints help", async () => {
  const result = await execFileAsync("node", ["src/cli/index.js", "--help"]);

  assert.match(result.stdout, /wpsc build/);
  assert.match(result.stdout, /wpsc create/);
});

test("cli prints version", async () => {
  const result = await execFileAsync("node", ["src/cli/index.js", "--version"]);

  assert.match(result.stdout, /^0\.0\.0/);
});

test("cli builds a project", async () => {
  const result = await execFileAsync("node", [
    "src/cli/index.js",
    "build",
    "--project",
    "examples/basic-shop"
  ]);

  assert.match(result.stdout, /Built 4 pages/);
});
