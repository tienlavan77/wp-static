import assert from "node:assert/strict";
import test from "node:test";
import createRuntimeConfig, {
  RUNTIME_CONFIG_VERSION,
  validateRuntimeConfig
} from "../framework/src/runtime/bootstrap/createRuntimeConfig.js";

test("createRuntimeConfig normalizes runtime configuration", () => {
  function demoPlugin() {}
  const result = createRuntimeConfig({
    cacheDir: ".cache/runtime",
    extensions: [
      {
        options: {
          enabled: true
        },
        plugin: {
          name: "demo-plugin"
        },
        source: "demo"
      },
      demoPlugin
    ],
    mode: "production",
    outputDir: "public",
    projectDir: "/tmp/wpsc-site",
    services: {
      logger: {
        info() {}
      }
    }
  });

  assert.equal(result.version, RUNTIME_CONFIG_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.config.mode, "production");
  assert.equal(result.config.paths.projectDir, "/tmp/wpsc-site");
  assert.equal(result.config.paths.outputDir, "/tmp/wpsc-site/public");
  assert.equal(result.config.paths.cacheDir, "/tmp/wpsc-site/.cache/runtime");
  assert.equal(result.config.extensions.length, 2);
  assert.equal(result.config.extensions[0].source, "demo");
  assert.equal(result.config.extensions[1].source, "demoPlugin");
  assert.deepEqual(result.diagnostics.errors, []);
});

test("createRuntimeConfig reports invalid root and invalid collections", () => {
  const invalidRoot = createRuntimeConfig(null);

  assert.equal(invalidRoot.ok, false);
  assert.equal(invalidRoot.diagnostics.errors[0].code, "runtime.config.invalid");

  const invalidCollections = createRuntimeConfig({
    extensions: {},
    mode: "development",
    services: []
  });

  assert.equal(invalidCollections.ok, false);
  assert.deepEqual(
    invalidCollections.diagnostics.errors.map((error) => error.code),
    ["runtime.config.extensions.invalid", "runtime.config.services.invalid"]
  );
});

test("createRuntimeConfig validates mode and duplicate extensions", () => {
  const result = createRuntimeConfig({
    extensions: [
      {
        plugin: {
          name: "demo"
        },
        source: "demo"
      },
      {
        plugin: {
          name: "demo"
        },
        source: "demo"
      }
    ],
    mode: "bad-mode"
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.errors.map((error) => error.code),
    ["runtime.config.mode.invalid", "runtime.config.extension.duplicate"]
  );
});

test("validateRuntimeConfig validates normalized config objects", () => {
  const diagnostics = validateRuntimeConfig({
    extensions: [
      {
        enabled: true,
        source: "a"
      },
      {
        enabled: true,
        source: "a"
      },
      {
        enabled: false,
        source: "a"
      }
    ],
    mode: "test"
  });

  assert.deepEqual(diagnostics.errors, [
    {
      code: "runtime.config.extension.duplicate",
      message: "Runtime extension \"a\" is defined more than once."
    }
  ]);
});
