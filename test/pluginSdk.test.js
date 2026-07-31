import assert from "node:assert/strict";
import test from "node:test";
import createHookSystem from "../framework/src/runtime/extensions/createHookSystem.js";
import createPluginSdk, {
  PLUGIN_SDK_VERSION
} from "../framework/src/runtime/extensions/createPluginSdk.js";
import createRuntimeContext from "../framework/src/runtime/bootstrap/createRuntimeContext.js";

test("createPluginSdk exposes stable plugin metadata and context accessors", () => {
  const context = createRuntimeContext({
    environment: {
      mode: "production",
      variables: {
        NODE_ENV: "production"
      }
    },
    projectDir: "/tmp/site",
    request: {
      type: "cli"
    }
  });
  const hooks = createHookSystem();
  const sdk = createPluginSdk({
    context,
    hooks,
    plugin: {
      name: "demo-plugin"
    }
  });

  assert.equal(sdk.version, PLUGIN_SDK_VERSION);
  assert.equal(sdk.name, "demo-plugin");
  assert.equal(sdk.context.runtimeVersion, context.version);
  assert.equal(sdk.context.environment.isProduction, true);
  assert.equal(sdk.context.paths.projectDir, "/tmp/site");
  assert.deepEqual(sdk.context.request, {
    type: "cli"
  });
  assert.equal(Object.isFrozen(sdk), true);
});

test("createPluginSdk registers and resolves services through runtime context", () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();
  const sdk = createPluginSdk({
    context,
    hooks,
    plugin: {
      name: "commerce-plugin"
    }
  });

  sdk.services.register(
    "pricing",
    () => ({
      format: (value) => `${value} VND`
    }),
    {
      factory: true,
      tags: ["commerce"]
    }
  );

  assert.equal(sdk.services.has("pricing"), true);
  assert.equal(sdk.services.resolve("pricing").format(12000), "12000 VND");
  assert.deepEqual(context.services.list(), [
    {
      initialized: true,
      lifecycle: "singleton",
      name: "pricing",
      tags: ["plugin", "commerce-plugin", "commerce"]
    }
  ]);
});

test("createPluginSdk registers hooks with plugin source metadata", async () => {
  const context = createRuntimeContext({
    services: {
      logger: {
        messages: [],
        info(message) {
          this.messages.push(message);
        }
      }
    }
  });
  const hooks = createHookSystem();
  const sdk = createPluginSdk({
    context,
    hooks,
    plugin: {
      name: "logger-plugin"
    }
  });

  sdk.hooks.tap(
    "runtime:ready",
    (payload, runtimeContext) => {
      runtimeContext.services.resolve("logger").info(payload.message);
    },
    {
      priority: 5
    }
  );

  await hooks.run(
    "runtime:ready",
    {
      message: "ready"
    },
    context
  );

  assert.deepEqual(context.services.resolve("logger").messages, ["ready"]);
  assert.deepEqual(sdk.hooks.list("runtime:ready"), [
    {
      name: "runtime:ready",
      once: false,
      priority: 5,
      source: "logger-plugin",
      tags: ["plugin", "logger-plugin"]
    }
  ]);
});

test("createPluginSdk validates required inputs", () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();

  assert.throws(
    () =>
      createPluginSdk({
        context,
        hooks,
        plugin: {}
      }),
    /Plugin name/
  );
  assert.throws(
    () =>
      createPluginSdk({
        hooks,
        plugin: {
          name: "demo"
        }
      }),
    /runtime context/
  );
  assert.throws(
    () =>
      createPluginSdk({
        context,
        plugin: {
          name: "demo"
        }
      }),
    /hook system/
  );
});
