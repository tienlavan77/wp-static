export default function toJsonData(value) {
  if (value === undefined) return null;
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(toJsonData);
  if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonData(item)]));
  }
  return String(value);
}
