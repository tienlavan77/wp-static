export const SERVICE_CONTAINER_VERSION = "1.0";

function assertServiceName(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("Service name must be a non-empty string.");
  }
}

function isDisposable(value) {
  return (
    value &&
    (typeof value.dispose === "function" || typeof value.destroy === "function")
  );
}

function createRecord(name, value, options = {}) {
  const lifecycle = options.lifecycle || (options.factory ? "singleton" : "value");

  if (!["singleton", "transient", "value"].includes(lifecycle)) {
    throw new TypeError(`Unsupported service lifecycle: ${lifecycle}`);
  }

  if ((lifecycle === "singleton" || lifecycle === "transient") && typeof value !== "function") {
    throw new TypeError(`Service "${name}" requires a factory function.`);
  }

  return {
    initialized: false,
    lifecycle,
    name,
    tags: [...(options.tags || [])],
    value
  };
}

export default function createServiceContainer(options = {}) {
  const records = new Map();
  const instances = new Map();
  let disposed = false;

  function assertActive() {
    if (disposed) {
      throw new Error("Service container has been disposed.");
    }
  }

  const container = {
    version: SERVICE_CONTAINER_VERSION,

    register(name, value, registerOptions = {}) {
      assertActive();
      assertServiceName(name);

      if (records.has(name) && registerOptions.replace !== true) {
        throw new Error(`Service "${name}" is already registered.`);
      }

      if (records.has(name)) {
        instances.delete(name);
      }

      records.set(name, createRecord(name, value, registerOptions));
      return container;
    },

    has(name) {
      return records.has(name);
    },

    resolve(name, context) {
      assertActive();
      assertServiceName(name);

      const record = records.get(name);
      if (!record) {
        throw new Error(`Service "${name}" is not registered.`);
      }

      if (record.lifecycle === "value") {
        return record.value;
      }

      if (record.lifecycle === "transient") {
        return record.value(context, container);
      }

      if (!instances.has(name)) {
        instances.set(name, record.value(context, container));
        record.initialized = true;
      }

      return instances.get(name);
    },

    list() {
      return [...records.values()].map((record) => ({
        initialized: record.initialized,
        lifecycle: record.lifecycle,
        name: record.name,
        tags: [...record.tags]
      }));
    },

    async dispose() {
      if (disposed) {
        return;
      }

      const serviceInstances = [...instances.values()].reverse();
      instances.clear();
      disposed = true;

      for (const instance of serviceInstances) {
        if (isDisposable(instance)) {
          const dispose = instance.dispose || instance.destroy;
          await dispose.call(instance);
        }
      }
    }
  };

  for (const [name, value] of Object.entries(options.services || {})) {
    container.register(name, value);
  }

  return container;
}
