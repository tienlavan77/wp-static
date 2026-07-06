import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("cli prints help", async () => {
  const result = await execFileAsync("node", ["src/cli/index.js", "--help"]);

  assert.match(result.stdout, /wpsc build/);
  assert.match(result.stdout, /wpsc create/);
  assert.match(result.stdout, /wpsc deploy rsync/);
  assert.match(result.stdout, /wpsc dev/);
  assert.match(result.stdout, /wpsc doctor/);
  assert.match(result.stdout, /wpsc webhook/);
});

test("cli prints version", async () => {
  const result = await execFileAsync("node", ["src/cli/index.js", "--version"]);

  assert.match(result.stdout, /^1\.0\.0/);
});

test("cli builds a project", async () => {
  const result = await execFileAsync("node", [
    "src/cli/index.js",
    "build",
    "--project",
    "examples/basic-shop"
  ]);

  assert.match(result.stdout, /Project: Basic Shop/);
  assert.match(result.stdout, /Pages: 6/);
  assert.match(result.stdout, /\/iphone-15 -> iphone-15\.html/);
  assert.match(result.stdout, /\/dien-thoai -> dien-thoai\.html/);
});

test("cli doctors a project", async () => {
  const result = await execFileAsync("node", [
    "src/cli/index.js",
    "doctor",
    "--project",
    "examples/basic-shop"
  ]);

  assert.match(result.stdout, /OK Node.js >= 20/);
  assert.match(result.stdout, /OK Config file/);
});
