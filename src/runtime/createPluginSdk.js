export const PLUGIN_SDK_VERSION = "1.0";

function assertPlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new TypeError("Plugin descriptor must be an object.");
  }

  if (typeof plugin.name !== "string" || plugin.name.trim() === "") {
    throw new TypeError("Plugin name must be a non-empty string.");
  }
}

function mergeTags(options = {}, pluginName) {
  return [...new Set(["plugin", pluginName, ...(options.tags || [])])];
}

export default function createPluginSdk(options = {}) {
  const { context, hooks, plugin } = options;

  assertPlugin(plugin);

  if (!context || !context.services) {
    throw new TypeError("Plugin SDK requires a runtime context with services.");
  }

  if (!hooks) {
    throw new TypeError("Plugin SDK requires a hook system.");
  }

  const pluginName = plugin.name;

  const sdk = {
    name: pluginName,
    plugin,
    version: PLUGIN_SDK_VERSION,

    context: {
      get diagnostics() {
        return context.diagnostics;
      },
      get environment() {
        return context.environment;
      },
      get paths() {
        return context.paths;
      },
      get request() {
        return context.request;
      },
      get runtimeVersion() {
        return context.version;
      }
    },

    services: {
      has(name) {
        return context.services.has(name);
      },

      resolve(name) {
        return context.services.resolve(name, context);
      },

      register(name, value, registerOptions = {}) {
        return context.services.register(name, value, {
          ...registerOptions,
          source: pluginName,
          tags: mergeTags(registerOptions, pluginName)
        });
      }
    },

    hooks: {
      tap(name, handler, hookOptions = {}) {
        return hooks.tap(name, handler, {
          ...hookOptions,
          source: pluginName,
          tags: mergeTags(hookOptions, pluginName)
        });
      },

      list(name) {
        return hooks.list(name);
      }
    }
  };

  return Object.freeze(sdk);
}
