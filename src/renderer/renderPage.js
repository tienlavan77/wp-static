import html from "./html.js";
import renderSeoTags from "../seo/renderSeoTags.js";

export default function renderPage(route, layout, options = {}) {
  if (typeof layout !== "function") {
    throw new Error("Renderer layout must be a function.");
  }

  const body = layout({
    components: options.components ?? {},
    content: route.content,
    graph: options.graph,
    route,
    site: options.site ?? {},
    theme: options.theme ?? {},
    html
  });

  return [
    "<!doctype html>",
    '<html lang="vi">',
    "  <head>",
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    "    <script>",
    "      (function () {",
    '        var storedTheme = localStorage.getItem("wpsc-theme");',
    '        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;',
    '        var theme = storedTheme || (prefersDark ? "dark" : "light");',
    '        document.documentElement.dataset.theme = theme;',
    "      }());",
    "    </script>",
    renderSeoTags(route.content, route, options),
    '    <link rel="stylesheet" href="/style.css?v=darkmode-1">',
    '    <link rel="stylesheet" href="/storefront.css?v=ui-23">',
    '    <script type="module" src="/wpsc-enhanced-navigation.js?v=29"></script>',
    "  </head>",
    "  <body>",
    body,
    "  </body>",
    "</html>"
  ].join("\n");
}
