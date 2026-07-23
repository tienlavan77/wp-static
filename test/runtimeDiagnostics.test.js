import assert from "node:assert/strict";
import test from "node:test";
import createExtensionLoader from "../src/runtime/createExtensionLoader.js";
import createHookSystem from "../src/runtime/createHookSystem.js";
import createRuntimeConfig from "../src/runtime/createRuntimeConfig.js";
import createRuntimeContext from "../src/runtime/createRuntimeContext.js";
import createRuntimeDiagnostics, {
  RUNTIME_DIAGNOSTICS_VERSION
} from "../src/runtime/createRuntimeDiagnostics.js";

test("createRuntimeDiagnostics collects runtime context and config diagnostics", () => {
  const runtimeConfig = createRuntimeConfig({
    extensions: {},
    mode: "bad-mode",
    projectDir: "/tmp/site"
  });
  const context = createRuntimeContext({
    diagnostics: {
      errors: [
        {
          code: "runtime.failed",
          message: "Runtime failed."
        }
      ],
      warnings: [
        {
          code: "runtime.warning",
          message: "Runtime warning."
        }
      ]
    },
    environment: {
      mode: "test",
      variables: {
        NODE_ENV: "test"
      }
    },
    projectDir: "/tmp/site"
  });

  const report = createRuntimeDiagnostics({
    context,
    generatedAt: "2026-07-23T00:00:00.000Z",
    runtimeConfig
  });

  assert.equal(report.version, RUNTIME_DIAGNOSTICS_VERSION);
  assert.equal(report.generatedAt, "2026-07-23T00:00:00.000Z");
  assert.equal(report.summary.ok, false);
  assert.equal(report.summary.errors, 3);
  assert.equal(report.summary.warnings, 1);
  assert.equal(report.namespaces.runtime.environment.mode, "test");
  assert.deepEqual(
    report.namespaces.config.errors.map((error) => error.code),
    ["runtime.config.extensions.invalid", "runtime.config.mode.invalid"]
  );
});

test("createRuntimeDiagnostics collects service, hook, and extension metadata", async () => {
  const context = createRuntimeContext({
    services: {
      logger: {
        info() {}
      }
    }
  });
  const hooks = createHookSystem();
  const extensions = createExtensionLoader({
    context,
    hooks
  });

  hooks.tap("runtime:ready", () => {}, {
    source: "runtime"
  });

  await extensions.load({
    name: "demo-extension",
    setup(sdk) {
      sdk.services.register(
        "pricing",
        () => ({
          enabled: true
        }),
        {
          factory: true
        }
      );
      sdk.hooks.tap("price:label", (label) => `${label} demo`);
    },
    version: "1.0.0"
  });

  context.services.resolve("pricing", context);

  const report = createRuntimeDiagnostics({
    context,
    extensions,
    hooks
  });

  assert.equal(report.summary.ok, true);
  assert.equal(report.namespaces.services.metrics.registered, 2);
  assert.equal(report.namespaces.services.metrics.singleton, 1);
  assert.equal(report.namespaces.services.metrics.value, 1);
  assert.deepEqual(
    report.namespaces.services.services.map((service) => service.name),
    ["logger", "pricing"]
  );
  assert.equal(report.namespaces.hooks.metrics.registered, 2);
  assert.deepEqual(report.namespaces.hooks.metrics.sources, [
    "demo-extension",
    "runtime"
  ]);
  assert.deepEqual(report.namespaces.extensions.extensions, [
    {
      loaded: true,
      name: "demo-extension",
      source: "runtime",
      version: "1.0.0"
    }
  ]);
});

test("createRuntimeDiagnostics tolerates missing runtime primitives", () => {
  const report = createRuntimeDiagnostics();

  assert.equal(report.summary.ok, true);
  assert.equal(report.namespaces.runtime.runtimeVersion, null);
  assert.deepEqual(report.namespaces.services.services, []);
  assert.deepEqual(report.namespaces.hooks.hooks, []);
  assert.deepEqual(report.namespaces.extensions.extensions, []);
});
