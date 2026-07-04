export default function validateBlockProps(block, props = {}) {
  const errors = [];
  const normalizedProps = {};

  for (const [propName, schema] of Object.entries(block.props ?? {})) {
    const value = props[propName] ?? schema.default;

    if (value === undefined || value === null) {
      if (schema.required) {
        errors.push(`Block "${block.name}" prop "${propName}" is required.`);
      }

      continue;
    }

    if (!matchesType(value, schema.type)) {
      errors.push(`Block "${block.name}" prop "${propName}" must be ${schema.type}.`);
      continue;
    }

    normalizedProps[propName] = value;
  }

  return {
    errors,
    ok: errors.length === 0,
    props: normalizedProps
  };
}

function matchesType(value, type) {
  if (type === "array") {
    return Array.isArray(value);
  }

  if (type === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  return typeof value === type;
}
