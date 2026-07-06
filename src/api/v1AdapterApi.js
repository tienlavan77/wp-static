export const V1_ADAPTER_REQUIRED_METHODS = Object.freeze([
  "getContents"
]);

export const V1_ADAPTER_OPTIONAL_METHODS = Object.freeze([
  "getCollections",
  "getCacheKey"
]);

export const V1_ADAPTER_API = Object.freeze({
  version: "1.0",
  requiredMethods: V1_ADAPTER_REQUIRED_METHODS,
  optionalMethods: V1_ADAPTER_OPTIONAL_METHODS
});
