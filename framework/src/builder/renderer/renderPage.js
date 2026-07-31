import html from "./html.js";
import renderSeoTags from "../seo/renderSeoTags.js";
import createSharedRenderingContext from "../../theme/createSharedRenderingContext.js";

export default function renderPage(route, layout, options = {}) {
  if (typeof layout !== "function") {
    throw new Error("Renderer layout must be a function.");
  }

  const context = createSharedRenderingContext({
    account: options.account,
    commerce: options.commerce,
    content: route.content,
    graph: options.graph,
    navigation: options.navigation,
    media: options.media,
    route,
    routing: options.routing,
    site: options.site,
    siteId: options.siteId,
    theme: options.theme
  });
  const body = layout({
    components: options.components ?? {},
    content: context.content,
    context,
    graph: options.graph,
    media: context.media,
    navigation: context.navigation,
    route,
    routing: context.routing,
    seo: context.seo,
    site: context.site,
    theme: context.theme,
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
    renderSeoTags(route.content, route, { ...options, metadata: context.seo }),
    '    <link rel="stylesheet" href="/storefront.css?v=ui-23">',
    '    <script type="module" src="/wpsc-enhanced-navigation.js?v=33"></script>',
    "  </head>",
    "  <body>",
    body,
    "  </body>",
    "</html>"
  ].join("\n");
}
