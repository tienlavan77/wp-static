import html from "./html.js";
import escapeHtml from "../shared/escapeHtml.js";

export default function renderPage(route, layout) {
  if (typeof layout !== "function") {
    throw new Error("Renderer layout must be a function.");
  }

  const body = layout({
    content: route.content,
    route,
    html
  });

  return [
    "<!doctype html>",
    '<html lang="vi">',
    "  <head>",
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${escapeHtml(route.content.title)}</title>`,
    "  </head>",
    "  <body>",
    body,
    "  </body>",
    "</html>"
  ].join("\n");
}
