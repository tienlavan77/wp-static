import assert from "node:assert/strict";
import test from "node:test";
import createHookSystem, {
  HOOK_SYSTEM_VERSION
} from "../src/runtime/createHookSystem.js";

test("createHookSystem runs hooks by priority and registration order", async () => {
  const hooks = createHookSystem();
  const events = [];

  hooks.tap("runtime:init", () => events.push("third"), {
    priority: 20
  });
  hooks.tap("runtime:init", () => events.push("first"), {
    priority: 1
  });
  hooks.tap("runtime:init", () => events.push("second"), {
    priority: 1
  });

  const results = await hooks.run("runtime:init");

  assert.equal(hooks.version, HOOK_SYSTEM_VERSION);
  assert.deepEqual(events, ["first", "second", "third"]);
  assert.deepEqual(results, [1, 2, 3]);
});

test("createHookSystem passes payload and runtime context", async () => {
  const hooks = createHookSystem();
  const logger = {
    messages: [],
    info(message) {
      this.messages.push(message);
    }
  };
  const context = {
    services: {
      resolve(name) {
        assert.equal(name, "logger");
        return logger;
      }
    }
  };

  hooks.tap("runtime:ready", (payload, runtimeContext) => {
    runtimeContext.services.resolve("logger").info(payload.message);
  });

  await hooks.run(
    "runtime:ready",
    {
      message: "ready"
    },
    context
  );

  assert.deepEqual(logger.messages, ["ready"]);
});

test("createHookSystem filters values in sequence", async () => {
  const hooks = createHookSystem();

  hooks.tap("route:title", (title) => `${title} - WPSC`);
  hooks.tap("route:title", (title) => title.toUpperCase());
  hooks.tap("route:title", () => undefined);

  const title = await hooks.filter("route:title", "Home");

  assert.equal(title, "HOME - WPSC");
});

test("createHookSystem supports once handlers and unsubscribe", async () => {
  const hooks = createHookSystem();
  let count = 0;

  hooks.tap(
    "runtime:init",
    () => {
      count += 1;
    },
    {
      once: true
    }
  );

  const unsubscribe = hooks.tap("runtime:init", () => {
    count += 100;
  });

  assert.equal(unsubscribe(), true);

  await hooks.run("runtime:init");
  await hooks.run("runtime:init");

  assert.equal(count, 1);
  assert.equal(hooks.has("runtime:init"), false);
});

test("createHookSystem exposes hook metadata without handlers", () => {
  const hooks = createHookSystem();

  hooks.tap("plugin:load", () => {}, {
    priority: 5,
    source: "plugin-a",
    tags: ["plugin"]
  });

  assert.deepEqual(hooks.list("plugin:load"), [
    {
      name: "plugin:load",
      once: false,
      priority: 5,
      source: "plugin-a",
      tags: ["plugin"]
    }
  ]);
});

test("createHookSystem validates hook names and handlers", () => {
  const hooks = createHookSystem();

  assert.throws(() => hooks.tap("", () => {}), /non-empty string/);
  assert.throws(() => hooks.tap("runtime:init", null), /function/);
  assert.throws(
    () =>
      hooks.tap("runtime:init", () => {}, {
        priority: Number.NaN
      }),
    /finite number/
  );
});
