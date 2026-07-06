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
    '    <link rel="stylesheet" href="/storefront.css?v=ui-3">',
    "  </head>",
    "  <body>",
    '    <div class="site-shell">',
    '      <header class="site-header">',
    '        <a class="brand" href="/">Basic Shop</a>',
    '        <nav class="nav" aria-label="Primary">',
    '          <a href="/">Trang chủ</a>',
    '          <a href="/gioi-thieu">Giới thiệu</a>',
    '          <a href="/iphone-15">iPhone 15</a>',
    '          <a href="/builder.html">Builder</a>',
    '        </nav>',
    '        <button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng tối" aria-pressed="false" title="Đổi giao diện sáng tối">',
    '          <span class="theme-toggle__sun" aria-hidden="true">L</span>',
    '          <span class="theme-toggle__moon" aria-hidden="true">D</span>',
    "        </button>",
    '      </header>',
    body,
    "    </div>",
    "    <script>",
    "      (function () {",
    '        var button = document.querySelector(".theme-toggle");',
    "        if (!button) return;",
    "        function applyTheme(theme) {",
    "          document.documentElement.dataset.theme = theme;",
    '          localStorage.setItem("wpsc-theme", theme);',
    '          button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");',
    "        }",
    '        applyTheme(document.documentElement.dataset.theme || "light");',
    '        button.addEventListener("click", function () {',
    '          applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");',
    "        });",
    "      }());",
    "    </script>",
    "  </body>",
    "</html>"
  ].join("\n");
}
