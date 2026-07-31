import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import loadConfig from "../framework/src/core/loadConfig.js";

test("loadConfig loads wpsc.config.js from project dir", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-config-"));
  await writeFile(
    path.join(projectDir, "wpsc.config.js"),
    `export default {
      name: 'Test Shop',
      homepage: 'home',
      outputDir: './dist',
      adapter: {
        type: 'mock',
        source: './content.json'
      },
      theme: {
        layout: './theme/layout.js'
      }
    };`,
    "utf8"
  );

  const config = await loadConfig(projectDir);

  assert.equal(config.name, "Test Shop");
  assert.equal(config.homepage, "home");
});

test("loadConfig fails clearly when config is missing", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-missing-config-"));

  await assert.rejects(
    () => loadConfig(projectDir),
    /Config file not found:/
  );
});

test("loadConfig loads project .env without overriding existing process env", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-env-config-"));
  const originalKey = process.env.WPSC_TEST_EXISTING;

  process.env.WPSC_TEST_EXISTING = "from-shell";

  await writeFile(
    path.join(projectDir, ".env"),
    [
      "# Project secrets",
      "WPSC_TEST_FROM_FILE=from-file",
      "WPSC_TEST_QUOTED=\"quoted value\"",
      "WPSC_TEST_EXISTING=from-env-file"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(projectDir, "wpsc.config.js"),
    `export default {
      name: 'Env Shop',
      homepage: 'home',
      outputDir: './dist',
      adapter: {
        type: 'mock',
        source: './content.json'
      },
      theme: {
        layout: './theme/layout.js'
      }
    };`,
    "utf8"
  );

  await loadConfig(projectDir);

  assert.equal(process.env.WPSC_TEST_FROM_FILE, "from-file");
  assert.equal(process.env.WPSC_TEST_QUOTED, "quoted value");
  assert.equal(process.env.WPSC_TEST_EXISTING, "from-shell");

  delete process.env.WPSC_TEST_FROM_FILE;
  delete process.env.WPSC_TEST_QUOTED;

  if (originalKey === undefined) {
    delete process.env.WPSC_TEST_EXISTING;
  } else {
    process.env.WPSC_TEST_EXISTING = originalKey;
  }
});
