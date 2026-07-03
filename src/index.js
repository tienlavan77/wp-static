export { default as buildSite } from "./builder/buildSite.js";
export { default as cleanOutput } from "./builder/cleanOutput.js";
export { default as compile } from "./core/compile.js";
export { default as createContent } from "./core/createContent.js";
export { default as createMockAdapter } from "./adapters/mockAdapter.js";
export { default as createRoutes } from "./router/createRoutes.js";
export { default as deepFreeze } from "./shared/deepFreeze.js";
export { default as escapeHtml } from "./shared/escapeHtml.js";
export { default as html } from "./renderer/html.js";
export { default as doctorProject } from "./core/doctorProject.js";
export { default as loadConfig } from "./core/loadConfig.js";
export { default as renderPage } from "./renderer/renderPage.js";
export { default as serveStatic } from "./dev-server/serveStatic.js";
export { default as validateConfig } from "./core/validateConfig.js";

export const version = "0.0.0";

export function getPackageInfo() {
  return {
    name: "wpsc",
    version,
    status: "draft"
  };
}
