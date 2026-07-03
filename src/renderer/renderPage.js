import html from "./html.js";
import renderSeoTags from "../seo/renderSeoTags.js";

export default function renderPage(route, layout, options = {}) {
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
    renderSeoTags(route.content, route, options),
    '    <link rel="stylesheet" href="/style.css">',
    "  </head>",
    "  <body>",
    '    <div class="site-shell">',
    '      <header class="site-header">',
    '        <a class="brand" href="/">Basic Shop</a>',
    '        <nav class="nav" aria-label="Primary">',
    '          <a href="/">Trang chủ</a>',
    '          <a href="/gioi-thieu">Giới thiệu</a>',
    '          <a href="/iphone-15">iPhone 15</a>',
    '        </nav>',
    '      </header>',
    body,
    "    </div>",
    "  </body>",
    "</html>"
  ].join("\n");
}
