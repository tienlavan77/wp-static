import isPlainObject from "./isPlainObject.js";

export default function normalizeJsonValue(value, path, errors) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      errors.push({
        message: "Number values must be finite",
        path
      });
      return null;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeJsonValue(item, `${path}[${index}]`, errors));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeJsonValue(item, `${path}.${key}`, errors)
      ])
    );
  }

  errors.push({
    message: "Value must be JSON serializable",
    path
  });

  return null;
}
