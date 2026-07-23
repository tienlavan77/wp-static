import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createInstallConfiguration from "../src/core/createInstallConfiguration.js";
import validateProjectConfig from "../src/validation/validateProjectConfig.js";

test("createInstallConfiguration generates install files", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-install-"));
  const result = await createInstallConfiguration(projectDir, {
    domain: "https://store.example.com",
    outputDir: "./public",
    siteName: "Example Store",
    wordpressUrl: "https://api.example.com"
  });

  assert.equal(result.summary.error, 0);
  assert.equal(result.summary.ok, 7);
  assert.equal(result.summary.warning, 0);

  await access(path.join(projectDir, ".env"));
  await access(path.join(projectDir, "wpsc.config.js"));
  await access(path.join(projectDir, "runtime.config.js"));
  await access(path.join(projectDir, "theme", "layout.js"));
  await access(path.join(projectDir, "theme", "components", "index.js"));

  const env = await readFile(path.join(projectDir, ".env"), "utf8");

  assert.match(env, /WPSC_WP_URL=https:\/\/api\.example\.com/);
  assert.match(env, /WPSC_SITE_URL=https:\/\/store\.example\.com/);
});

test("createInstallConfiguration output passes config validation", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-install-"));

  await createInstallConfiguration(projectDir, {
    domain: "https://store.example.com",
    force: true,
    wordpressUrl: "https://api.example.com"
  });

  const results = await validateProjectConfig(projectDir);

  assert.equal(results.every((result) => result.ok), true);
  assert.equal(results.some((result) => result.name === "Runtime configuration" && result.status === "ok"), true);
  assert.equal(results.some((result) => result.name === "Adapter type" && result.detail === "wordpressWooCommerce"), true);
});

test("createInstallConfiguration protects existing files unless forced", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-install-"));

  await createInstallConfiguration(projectDir, {
    wordpressUrl: "https://api.example.com"
  });

  await assert.rejects(
    () => createInstallConfiguration(projectDir, {
      wordpressUrl: "https://api.example.com"
    }),
    /EEXIST/
  );

  const result = await createInstallConfiguration(projectDir, {
    force: true,
    wordpressUrl: "https://api.example.com"
  });

  assert.equal(result.summary.error, 0);
});

test("createInstallConfiguration reports placeholder warnings", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-install-"));
  const result = await createInstallConfiguration(projectDir);

  assert.equal(result.summary.warning, 2);
  assert.equal(result.results.some((check) => check.name === "WordPress URL" && check.status === "warning"), true);
  assert.equal(result.results.some((check) => check.name === "Domain URL" && check.status === "warning"), true);
});
