import createPluginSdk from "./createPluginSdk.js";

export const EXTENSION_LOADER_VERSION = "1.0";

function normalizePlugin(plugin) {
  if (typeof plugin === "function") {
    return {
      name: plugin.name || "anonymous-plugin",
      setup: plugin
    };
  }

  if (!plugin || typeof plugin !== "object") {
    throw new TypeError("Extension must be a plugin object or setup function.");
  }

  const descriptor = plugin.default && typeof plugin.default === "object"
    ? plugin.default
    : plugin;

  if (typeof descriptor.name !== "string" || descriptor.name.trim() === "") {
    throw new TypeError("Extension plugin name must be a non-empty string.");
  }

  if (descriptor.setup !== undefined && typeof descriptor.setup !== "function") {
    throw new TypeError(`Extension plugin "${descriptor.name}" setup must be a function.`);
  }

  return descriptor;
}

function toPublicExtensionRecord(record) {
  return {
    loaded: record.loaded,
    name: record.plugin.name,
    source: record.source,
    version: record.plugin.version || null
  };
}

export default function createExtensionLoader(options = {}) {
  const { context, hooks } = options;
  const records = [];
  const loadedNames = new Set();

  if (!context || !context.services) {
    throw new TypeError("Extension Loader requires a runtime context with services.");
  }

  if (!hooks) {
    throw new TypeError("Extension Loader requires a hook system.");
  }

  const loader = {
    version: EXTENSION_LOADER_VERSION,

    async load(pluginInput, loadOptions = {}) {
      const plugin = normalizePlugin(pluginInput);

      if (loadedNames.has(plugin.name) && loadOptions.replace !== true) {
        throw new Error(`Extension plugin "${plugin.name}" is already loaded.`);
      }

      if (loadedNames.has(plugin.name)) {
        const index = records.findIndex((record) => record.plugin.name === plugin.name);
        records.splice(index, 1);
      }

      const sdk = createPluginSdk({
        context,
        hooks,
        plugin
      });

      const record = {
        loaded: false,
        plugin,
        sdk,
        source: loadOptions.source || plugin.source || "runtime"
      };

      if (plugin.setup) {
        await plugin.setup(sdk);
      }

      record.loaded = true;
      records.push(record);
      loadedNames.add(plugin.name);

      await hooks.run(
        "extension:loaded",
        {
          extension: toPublicExtensionRecord(record)
        },
        context
      );

      return toPublicExtensionRecord(record);
    },

    async loadAll(plugins = [], loadOptions = {}) {
      const results = [];

      for (const plugin of plugins) {
        results.push(await loader.load(plugin, loadOptions));
      }

      return results;
    },

    has(name) {
      return loadedNames.has(name);
    },

    list() {
      return records.map(toPublicExtensionRecord);
    }
  };

  return loader;
}
