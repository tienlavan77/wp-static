export const V1_PLUGIN_HOOKS = Object.freeze([
  "data",
  "routes",
  "render",
  "buildStart",
  "buildEnd"
]);

export const V1_PLUGIN_API = Object.freeze({
  version: "1.0",
  hooks: V1_PLUGIN_HOOKS
});
