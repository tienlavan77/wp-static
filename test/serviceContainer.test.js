import assert from "node:assert/strict";
import test from "node:test";
import createServiceContainer, {
  SERVICE_CONTAINER_VERSION
} from "../src/runtime/createServiceContainer.js";

test("createServiceContainer registers and resolves value services", () => {
  const logger = {
    info() {}
  };
  const container = createServiceContainer({
    services: {
      logger
    }
  });

  assert.equal(container.version, SERVICE_CONTAINER_VERSION);
  assert.equal(container.has("logger"), true);
  assert.equal(container.resolve("logger"), logger);
  assert.deepEqual(container.list(), [
    {
      initialized: false,
      lifecycle: "value",
      name: "logger",
      tags: []
    }
  ]);
});

test("createServiceContainer resolves singleton factories once", () => {
  const container = createServiceContainer();
  let created = 0;

  container.register(
    "auth",
    (context) => {
      created += 1;
      return {
        projectDir: context.paths.projectDir
      };
    },
    {
      factory: true,
      tags: ["runtime"]
    }
  );

  const context = {
    paths: {
      projectDir: "/tmp/site"
    }
  };

  assert.deepEqual(container.resolve("auth", context), {
    projectDir: "/tmp/site"
  });
  assert.equal(container.resolve("auth", context), container.resolve("auth", context));
  assert.equal(created, 1);
  assert.deepEqual(container.list(), [
    {
      initialized: true,
      lifecycle: "singleton",
      name: "auth",
      tags: ["runtime"]
    }
  ]);
});

test("createServiceContainer supports transient factories", () => {
  const container = createServiceContainer();
  let created = 0;

  container.register(
    "request",
    () => {
      created += 1;
      return {
        id: created
      };
    },
    {
      lifecycle: "transient"
    }
  );

  assert.deepEqual(container.resolve("request"), {
    id: 1
  });
  assert.deepEqual(container.resolve("request"), {
    id: 2
  });
});

test("createServiceContainer disposes singleton services", async () => {
  const events = [];
  const container = createServiceContainer();

  container.register(
    "database",
    () => ({
      dispose() {
        events.push("disposed");
      }
    }),
    {
      factory: true
    }
  );

  container.resolve("database");
  await container.dispose();

  assert.deepEqual(events, ["disposed"]);
  assert.throws(() => container.resolve("database"), /disposed/);
});

test("createServiceContainer rejects duplicate and missing services", () => {
  const container = createServiceContainer();

  container.register("logger", {});

  assert.throws(() => container.register("logger", {}), /already registered/);
  assert.throws(() => container.resolve("missing"), /not registered/);
  assert.throws(() => container.register("", {}), /non-empty string/);
});
