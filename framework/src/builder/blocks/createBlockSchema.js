const ALLOWED_PROP_TYPES = new Set(["array", "boolean", "number", "object", "string"]);
const ALLOWED_BINDING_SOURCES = new Set(["content", "graph", "route", "site", "theme"]);

export default function createBlockSchema(rawBlock = {}) {
  assertString(rawBlock.name, 'Block field "name" is required.');
  assertString(rawBlock.label, 'Block field "label" is required.');

  if (rawBlock.render !== undefined && typeof rawBlock.render !== "function") {
    throw new Error('Block field "render" must be a function when provided.');
  }

  return Object.freeze({
    name: rawBlock.name.trim(),
    label: rawBlock.label.trim(),
    category: normalizeString(rawBlock.category) ?? "general",
    description: normalizeString(rawBlock.description),
    icon: normalizeString(rawBlock.icon),
    props: normalizePropsSchema(rawBlock.props),
    bindings: normalizeBindingsSchema(rawBlock.bindings),
    render: rawBlock.render ?? null
  });
}

function normalizePropsSchema(props = {}) {
  if (!isPlainObject(props)) {
    throw new Error('Block field "props" must be a plain object.');
  }

  return Object.freeze(Object.fromEntries(
    Object.entries(props).map(([propName, schema]) => [
      propName,
      normalizePropSchema(propName, schema)
    ])
  ));
}

function normalizePropSchema(propName, schema = {}) {
  if (!isPlainObject(schema)) {
    throw new Error(`Block prop "${propName}" schema must be a plain object.`);
  }

  const type = normalizeString(schema.type);

  if (!type || !ALLOWED_PROP_TYPES.has(type)) {
    throw new Error(`Block prop "${propName}" type must be one of: ${[...ALLOWED_PROP_TYPES].join(", ")}.`);
  }

  return Object.freeze({
    type,
    default: schema.default,
    label: normalizeString(schema.label) ?? propName,
    required: schema.required === true
  });
}

function normalizeBindingsSchema(bindings = {}) {
  if (!isPlainObject(bindings)) {
    throw new Error('Block field "bindings" must be a plain object.');
  }

  return Object.freeze(Object.fromEntries(
    Object.entries(bindings).map(([bindingName, binding]) => [
      bindingName,
      normalizeBindingSchema(bindingName, binding)
    ])
  ));
}

function normalizeBindingSchema(bindingName, binding = {}) {
  if (!isPlainObject(binding)) {
    throw new Error(`Block binding "${bindingName}" schema must be a plain object.`);
  }

  const source = normalizeString(binding.source);
  const path = normalizeString(binding.path);

  if (!source || !ALLOWED_BINDING_SOURCES.has(source)) {
    throw new Error(`Block binding "${bindingName}" source must be one of: ${[...ALLOWED_BINDING_SOURCES].join(", ")}.`);
  }

  assertString(path, `Block binding "${bindingName}" path is required.`);

  return Object.freeze({
    source,
    path,
    fallback: binding.fallback
  });
}

function assertString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
}

function normalizeString(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
