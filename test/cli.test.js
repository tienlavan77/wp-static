import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

async function fixtureProject() {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-cli-fixture-"));
  await cp("fixtures/basic-shop", projectDir, { recursive: true });
  return { projectDir, cleanup: () => rm(projectDir, { force: true, recursive: true }) };
}

test("cli prints help", async () => {
  const result = await execFileAsync("node", ["framework/src/cli/index.js", "--help"]);

  assert.match(result.stdout, /wpsc build/);
  assert.match(result.stdout, /wpsc create/);
  assert.match(result.stdout, /wpsc deploy rsync/);
  assert.match(result.stdout, /wpsc dev/);
  assert.match(result.stdout, /wpsc doctor/);
  assert.match(result.stdout, /wpsc webhook/);
});

test("cli prints version", async () => {
  const result = await execFileAsync("node", ["framework/src/cli/index.js", "--version"]);

  assert.match(result.stdout, /^1\.0\.0/);
});

test("cli builds a project", async () => {
  const fixture = await fixtureProject();
  try {
  const result = await execFileAsync("node", [
    "framework/src/cli/index.js",
    "build",
    "--project",
    fixture.projectDir
  ]);

  assert.match(result.stdout, /Project: Basic Shop/);
  assert.match(result.stdout, /Pages: 7/);
  assert.match(result.stdout, /\/iphone-15 -> iphone-15\.html/);
  assert.match(result.stdout, /\/ui-storefront-demo -> ui-storefront-demo\.html/);
  assert.match(result.stdout, /\/dien-thoai -> dien-thoai\.html/);
  } finally {
    await fixture.cleanup();
  }
});

test("cli doctors a project", async () => {
  const fixture = await fixtureProject();
  try {
  const result = await execFileAsync("node", [
    "framework/src/cli/index.js",
    "doctor",
    "--project",
    fixture.projectDir
  ]);

  assert.match(result.stdout, /\[OK\] Node.js >= 20/);
  assert.match(result.stdout, /\[OK\] Config file/);
  } finally {
    await fixture.cleanup();
  }
});
