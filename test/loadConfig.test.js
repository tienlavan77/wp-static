import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import loadConfig from "../src/core/loadConfig.js";

test("loadConfig loads wpsc.config.js from project dir", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-config-"));
  await writeFile(
    path.join(projectDir, "wpsc.config.js"),
    "export default { name: 'Test Shop', homepage: 'home' };",
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
