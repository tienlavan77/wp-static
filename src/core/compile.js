import path from "node:path";
import { pathToFileURL } from "node:url";
import createMockAdapter from "../adapters/mockAdapter.js";
import createRoutes from "../router/createRoutes.js";
import renderPage from "../renderer/renderPage.js";

export default async function compile(config, options = {}) {
  const projectDir = options.projectDir ?? process.cwd();
  const adapter = createAdapter(config, projectDir);
  const contents = await adapter.getContents();
  const routes = createRoutes(contents, config);
  const layout = await loadLayout(config, projectDir);
  const pages = routes.map((route) => ({
    route,
    html: renderPage(route, layout)
  }));

  return {
    routes,
    pages
  };
}

function createAdapter(config, projectDir) {
  if (config.adapter?.type !== "mock") {
    throw new Error(`Unsupported adapter type "${config.adapter?.type}".`);
  }

  return createMockAdapter({
    source: config.adapter.source,
    baseDir: projectDir
  });
}

async function loadLayout(config, projectDir) {
  const layoutPath = config.theme?.layout;

  if (typeof layoutPath !== "string" || layoutPath.trim() === "") {
    throw new Error('Config field "theme.layout" is required.');
  }

  const absolutePath = path.resolve(projectDir, layoutPath);
  const module = await import(pathToFileURL(absolutePath).href);

  return module.default;
}
