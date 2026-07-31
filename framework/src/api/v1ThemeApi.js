export const V1_THEME_CONFIG_FIELDS = Object.freeze([
  "layout",
  "layouts",
  "components",
  "assets",
  "blocks",
  "meta"
]);

export const V1_THEME_LAYOUT_CONTEXT_FIELDS = Object.freeze([
  "components",
  "content",
  "graph",
  "html",
  "route",
  "site",
  "theme"
]);

export const V1_THEME_API = Object.freeze({
  version: "1.0",
  configFields: V1_THEME_CONFIG_FIELDS,
  layoutContextFields: V1_THEME_LAYOUT_CONTEXT_FIELDS
});
