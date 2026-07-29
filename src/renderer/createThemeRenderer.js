import deepFreeze from "../shared/deepFreeze.js";
import html from "./html.js";

export const THEME_RENDERER_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

function renderDocument(body, title, stylesheets = [], scripts = []) {
  const styles = stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n");
  const modules = scripts.map((src) => `<script type="module" src="${src}"></script>`).join("\n");
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n${styles}\n</head>\n<body>\n${body}\n${modules}\n</body>\n</html>`;
}

export default function createThemeRenderer(options = {}) {
  const layouts = options.layouts || {};
  const defaultLayout = options.defaultLayout;
  const assets = Array.isArray(options.assets) ? options.assets : [];
  const createContext = typeof options.createContext === "function" ? options.createContext : null;
  const createAdditionalPages = typeof options.createAdditionalPages === "function" ? options.createAdditionalPages : null;
  const resolveLayout = typeof options.resolveLayout === "function" ? options.resolveLayout : null;
  const stylesheets = Array.isArray(options.stylesheets) ? options.stylesheets : [];
  const scripts = Array.isArray(options.scripts) ? options.scripts : [];
  if (typeof defaultLayout !== "function") {
    throw new TypeError("Theme Renderer requires a default layout function.");
  }
  if (!Object.values(layouts).every((layout) => typeof layout === "function")) {
    throw new TypeError("Theme Renderer layouts must be functions.");
  }

  function render(model) {
    if (!model || !Array.isArray(model.items)) {
      return { diagnostics: { errors: [diagnostic("theme.renderer.model.invalid", "Theme Renderer requires a Content Model.")], warnings: [] }, ok: false };
    }
    try {
      const renderContent = (content, pagePath = `/${content.slug}/`) => {
        const layout = resolveLayout ? resolveLayout(content, { path: pagePath }) : (layouts[content.type] || defaultLayout);
        if (typeof layout !== "function") throw new TypeError(`Theme layout is unavailable for ${content.type}.`);
        const route = { path: pagePath };
        const context = createContext ? createContext({ content, model, route }) : {};
        const body = layout({ content, html, items: model.items, route, ...context });
        if (typeof body !== "string") throw new TypeError("Theme layout must return HTML.");
        return deepFreeze({ content, contentId: content.id, html: renderDocument(body, content.title, stylesheets, scripts), path: pagePath });
      };
      const pages = model.items.map((content) => renderContent(content));
      const home = model.items.find((content) => ["home", "homepage"].includes(content.slug)) || model.items[0];
      if (home) pages.push(renderContent(home, "/"));
      for (const page of createAdditionalPages ? createAdditionalPages(model) : []) {
        pages.push(renderContent(page.content, page.path));
      }
      return deepFreeze({ assets: deepFreeze([...assets]), diagnostics: { errors: [], warnings: [] }, ok: true, pages: deepFreeze(pages) });
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("theme.renderer.render.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ render, version: THEME_RENDERER_VERSION });
}
