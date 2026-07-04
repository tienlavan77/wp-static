export default function resolveBlockBindings(block, context = {}) {
  const values = {};

  for (const [bindingName, binding] of Object.entries(block.bindings ?? {})) {
    const source = context[binding.source];
    const value = getPath(source, binding.path);

    values[bindingName] = value === undefined ? binding.fallback : value;
  }

  return values;
}

function getPath(source, path) {
  if (!source || !path) {
    return undefined;
  }

  return path.split(".").reduce((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    return current[part];
  }, source);
}
