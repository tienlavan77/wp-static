import deepFreeze from "../shared/deepFreeze.js";
import html from "./html.js";

export const THEME_RENDERER_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

function renderDocument(body, title) {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n</head>\n<body>\n${body}\n</body>\n</html>`;
}

export default function createThemeRenderer(options = {}) {
  const layouts = options.layouts || {};
  const defaultLayout = options.defaultLayout;
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
      const pages = model.items.map((content) => {
        const layout = layouts[content.type] || defaultLayout;
        const body = layout({ content, html });
        if (typeof body !== "string") throw new TypeError("Theme layout must return HTML.");
        return deepFreeze({ contentId: content.id, html: renderDocument(body, content.title), path: `/${content.slug}/` });
      });
      return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, pages: deepFreeze(pages) });
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("theme.renderer.render.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ render, version: THEME_RENDERER_VERSION });
}
