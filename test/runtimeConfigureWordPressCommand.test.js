import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createRuntimeConfigureWordPressCommand from "../src/cli/createRuntimeConfigureWordPressCommand.js";

test("runtime:configure-wordpress backs up config and creates private credentials file", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-runtime-configure-"));
  try {
    await writeFile(path.join(workspaceDir, "runtime.config.js"), "export default {};\n");
    const result = await createRuntimeConfigureWordPressCommand({ workspaceDir }).run({ webhookBaseUrl: "https://site.example.test/webhook" });
    assert.equal(result.ok, true);
    assert.match(await readFile(result.configPath, "utf8"), /createWordPressSourceAdapter/);
    assert.match(await readFile(result.envPath, "utf8"), /WPSC_WP_APP_PASSWORD=/);
    assert.ok(result.backupPath);
  } finally { await rm(workspaceDir, { force: true, recursive: true }); }
});
