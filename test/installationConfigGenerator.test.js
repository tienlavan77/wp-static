import assert from "node:assert/strict";
import test from "node:test";
import createInstallationConfigGenerator, {
  INSTALLATION_CONFIG_GENERATOR_VERSION
} from "../src/installer/createInstallationConfigGenerator.js";

test("createInstallationConfigGenerator creates project and runtime config", () => {
  const result = createInstallationConfigGenerator({
    domain: "https://store.example.com/",
    outputDir: "public",
    projectDir: "/tmp/site",
    siteName: "Example Store",
    wordpressUrl: "https://api.example.com/"
  });

  assert.equal(result.version, INSTALLATION_CONFIG_GENERATOR_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.options.domain, "https://store.example.com");
  assert.equal(result.options.wordpressUrl, "https://api.example.com");
  assert.equal(result.config.project.name, "Example Store");
  assert.equal(result.config.project.outputDir, "public");
  assert.equal(result.config.runtime.mode, "development");
  assert.equal(result.config.runtime.paths.outputDir, "/tmp/site/public");
  assert.deepEqual(result.diagnostics.errors, []);
});

test("createInstallationConfigGenerator creates install file candidates", () => {
  const result = createInstallationConfigGenerator({
    domain: "https://store.example.com",
    wordpressUrl: "https://api.example.com"
  });

  assert.deepEqual(
    result.files.map((file) => file.path),
    [
      ".env",
      "wpsc.config.js",
      "runtime.config.js",
      "theme/layout.js",
      "theme/components/index.js"
    ]
  );
  assert.match(result.files[0].contents, /WPSC_SITE_URL=https:\/\/store.example.com/);
  assert.match(result.files[1].contents, /type: "wordpressWooCommerce"/);
  assert.match(result.files[2].contents, /mode: "development"/);
});

test("createInstallationConfigGenerator reports placeholder warnings", () => {
  const result = createInstallationConfigGenerator({
    projectDir: "/tmp/site"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.diagnostics.warnings.map((warning) => warning.code),
    [
      "install.config.wordpress.placeholder",
      "install.config.domain.placeholder"
    ]
  );
});

test("createInstallationConfigGenerator reuses runtime config validation", () => {
  const result = createInstallationConfigGenerator({
    mode: "bad-mode",
    projectDir: "/tmp/site",
    wordpressUrl: "https://api.example.com"
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.errors.map((error) => error.code),
    ["runtime.config.mode.invalid"]
  );
});
