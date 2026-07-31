function assertSourceType(type) {
  const normalized = String(type || "").trim().toLowerCase();

  if (!/^[a-z][a-z0-9_-]*$/.test(normalized)) {
    throw new TypeError("Source adapter type must start with a letter and contain only letters, numbers, underscores, or dashes.");
  }

  return normalized;
}

export default function createSourceRegistry(options = {}) {
  const adapters = new Map();

  for (const descriptor of options.adapters || []) {
    register(descriptor.type, descriptor.create);
  }

  function register(type, create) {
    const sourceType = assertSourceType(type);

    if (typeof create !== "function") {
      throw new TypeError(`Source adapter factory for "${sourceType}" must be a function.`);
    }

    if (adapters.has(sourceType)) {
      throw new Error(`Source adapter "${sourceType}" is already registered.`);
    }

    adapters.set(sourceType, create);
    return sourceType;
  }

  function resolve(type) {
    const sourceType = assertSourceType(type);
    const create = adapters.get(sourceType);

    if (!create) {
      const error = new Error(`Source adapter "${sourceType}" was not found.`);
      error.code = "source.adapter.not_found";
      throw error;
    }

    return create;
  }

  return {
    has(type) {
      return adapters.has(assertSourceType(type));
    },
    list() {
      return [...adapters.keys()].sort();
    },
    register,
    resolve
  };
}
