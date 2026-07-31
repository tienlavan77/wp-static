export const HOOK_SYSTEM_VERSION = "1.0";

function assertHookName(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("Hook name must be a non-empty string.");
  }
}

function assertHandler(handler) {
  if (typeof handler !== "function") {
    throw new TypeError("Hook handler must be a function.");
  }
}

function normalizePriority(priority) {
  if (priority === undefined) {
    return 10;
  }

  if (!Number.isFinite(priority)) {
    throw new TypeError("Hook priority must be a finite number.");
  }

  return priority;
}

function createHookRecord(name, handler, options = {}, order) {
  return {
    handler,
    name,
    once: options.once === true,
    order,
    priority: normalizePriority(options.priority),
    source: options.source || "runtime",
    tags: [...(options.tags || [])]
  };
}

export default function createHookSystem() {
  const hooks = new Map();
  let sequence = 0;

  function getRecords(name) {
    return hooks.get(name) || [];
  }

  function sortRecords(records) {
    return [...records].sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.order - right.order;
    });
  }

  const system = {
    version: HOOK_SYSTEM_VERSION,

    tap(name, handler, options = {}) {
      assertHookName(name);
      assertHandler(handler);

      const record = createHookRecord(name, handler, options, sequence);
      sequence += 1;

      hooks.set(name, [...getRecords(name), record]);

      return () => system.remove(name, handler);
    },

    remove(name, handler) {
      assertHookName(name);
      assertHandler(handler);

      const records = getRecords(name);
      const nextRecords = records.filter((record) => record.handler !== handler);

      if (nextRecords.length === 0) {
        hooks.delete(name);
      } else {
        hooks.set(name, nextRecords);
      }

      return records.length !== nextRecords.length;
    },

    has(name) {
      return getRecords(name).length > 0;
    },

    list(name) {
      if (name) {
        assertHookName(name);
        return sortRecords(getRecords(name)).map(toPublicHookRecord);
      }

      return [...hooks.keys()].sort().flatMap((hookName) =>
        sortRecords(getRecords(hookName)).map(toPublicHookRecord)
      );
    },

    async run(name, payload = {}, context) {
      assertHookName(name);

      const records = sortRecords(getRecords(name));
      const results = [];

      for (const record of records) {
        results.push(await record.handler(payload, context));

        if (record.once) {
          system.remove(name, record.handler);
        }
      }

      return results;
    },

    async filter(name, value, context) {
      assertHookName(name);

      let nextValue = value;
      const records = sortRecords(getRecords(name));

      for (const record of records) {
        const result = await record.handler(nextValue, context);

        if (result !== undefined) {
          nextValue = result;
        }

        if (record.once) {
          system.remove(name, record.handler);
        }
      }

      return nextValue;
    }
  };

  return system;
}

function toPublicHookRecord(record) {
  return {
    name: record.name,
    once: record.once,
    priority: record.priority,
    source: record.source,
    tags: [...record.tags]
  };
}
