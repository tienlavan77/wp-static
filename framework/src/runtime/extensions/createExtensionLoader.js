import createPluginSdk from "./createPluginSdk.js";

export const EXTENSION_LOADER_VERSION = "1.0";
export const EXTENSION_CONTRACT_SCHEMA = "wpsc.extension";
export const EXTENSION_CONTRACT_VERSION = 1;
export const EXTENSION_CAPABILITIES = Object.freeze(["build", "commerce", "content", "publishing", "routing", "seo", "theme"]);

function normalizePlugin(plugin) {
  if (typeof plugin === "function") {
    return normalizeDescriptor({
      name: plugin.name || "anonymous-plugin",
      setup: plugin
    });
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

  return normalizeDescriptor(descriptor);
}

function normalizeDescriptor(descriptor) {
  const capabilities = [...new Set(descriptor.capabilities ?? [])].map((item) => String(item).trim().toLowerCase());
  const unsupported = capabilities.filter((item) => !EXTENSION_CAPABILITIES.includes(item));
  if (unsupported.length) throw new TypeError(`Extension "${descriptor.name}" has unsupported capabilities: ${unsupported.join(", ")}.`);
  if (descriptor.siteScope !== undefined && !["site", "runtime"].includes(descriptor.siteScope)) throw new TypeError("Extension siteScope must be site or runtime.");
  const lifecycle = descriptor.lifecycle && typeof descriptor.lifecycle === "object" ? descriptor.lifecycle : {};
  const setup = descriptor.setup ?? lifecycle.setup;
  if (setup !== undefined && typeof setup !== "function") throw new TypeError(`Extension plugin "${descriptor.name}" lifecycle setup must be a function.`);
  if (lifecycle.unload !== undefined && typeof lifecycle.unload !== "function") throw new TypeError(`Extension plugin "${descriptor.name}" lifecycle unload must be a function.`);
  return {
    ...descriptor,
    capabilities,
    configuration: descriptor.configuration && typeof descriptor.configuration === "object" ? structuredClone(descriptor.configuration) : {},
    lifecycle,
    setup,
    siteScope: descriptor.siteScope ?? "runtime"
  };
}

function toExtensionContract(record) {
  return Object.freeze({
    capabilities: [...record.plugin.capabilities],
    configuration: structuredClone(record.plugin.configuration),
    loaded: record.loaded,
    name: record.plugin.name,
    schema: EXTENSION_CONTRACT_SCHEMA,
    schemaVersion: EXTENSION_CONTRACT_VERSION,
    siteId: record.siteId,
    siteScope: record.plugin.siteScope,
    source: record.source,
    version: record.plugin.version || null
  });
}

function toPublicExtensionRecord(record) {
  const result = {
    loaded: record.loaded,
    name: record.plugin.name,
    source: record.source,
    version: record.plugin.version || null
  };
  Object.defineProperties(result, {
    capabilities: { enumerable: false, value: [...record.plugin.capabilities] },
    configuration: { enumerable: false, value: structuredClone(record.plugin.configuration) },
    contract: { enumerable: false, value: EXTENSION_CONTRACT_SCHEMA },
    contractVersion: { enumerable: false, value: EXTENSION_CONTRACT_VERSION },
    siteId: { enumerable: false, value: record.siteId },
    siteScope: { enumerable: false, value: record.plugin.siteScope }
  });
  return Object.freeze(result);
}

export default function createExtensionLoader(options = {}) {
  const { context, hooks } = options;
  const records = [];
  const loadedNames = new Set();
  const siteId = String(context?.siteId ?? context?.siteContext?.siteId ?? "").trim() || null;

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
      if (plugin.siteScope === "site" && !siteId) throw new Error(`Extension "${plugin.name}" requires a Site Context.`);

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
        siteId,
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

      for (const plugin of [...plugins].sort((first, second) => extensionName(first).localeCompare(extensionName(second)))) {
        results.push(await loader.load(plugin, loadOptions));
      }

      return results;
    },

    has(name) {
      return loadedNames.has(name);
    },

    describe(name) {
      const record = records.find((item) => item.plugin.name === name);
      return record ? toExtensionContract(record) : null;
    },

    list() {
      return records.map(toPublicExtensionRecord);
    },

    listContracts() {
      return records.map(toExtensionContract);
    },

    async unload(name) {
      const record = records.find((item) => item.plugin.name === name);
      if (!record) return false;
      if (typeof record.plugin.lifecycle.unload === "function") await record.plugin.lifecycle.unload(record.sdk);
      records.splice(records.indexOf(record), 1);
      loadedNames.delete(name);
      return true;
    }
  };

  return loader;
}

function extensionName(plugin) {
  if (typeof plugin === "function") return plugin.name || "anonymous-plugin";
  return String(plugin?.name ?? plugin?.default?.name ?? "");
}
