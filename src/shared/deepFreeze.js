export default function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const propertyName of Reflect.ownKeys(value)) {
    deepFreeze(value[propertyName]);
  }

  return Object.freeze(value);
}
