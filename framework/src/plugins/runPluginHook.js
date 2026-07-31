export async function runPluginHook(plugins, hookName, value, context) {
  let currentValue = value;

  for (const plugin of plugins) {
    const hook = plugin[hookName];

    if (typeof hook !== "function") {
      continue;
    }

    const nextValue = await hook(currentValue, {
      ...context,
      hookName,
      plugin
    });

    if (nextValue !== undefined) {
      currentValue = nextValue;
    }
  }

  return currentValue;
}

export async function runPluginEvent(plugins, hookName, payload, context) {
  for (const plugin of plugins) {
    const hook = plugin[hookName];

    if (typeof hook === "function") {
      await hook(payload, {
        ...context,
        hookName,
        plugin
      });
    }
  }
}
