import renderLayout from "./renderLayout.js";

export default function renderThemePreview(layout, options = {}) {
  const theme = options.theme ?? {};
  const result = renderLayout(layout, {
    ...options,
    components: theme.components ?? options.components,
    theme
  });

  return {
    ...result,
    html: wrapPreviewHtml(result.html, theme)
  };
}

function wrapPreviewHtml(body, theme) {
  const themeName = theme.metadata?.name ?? theme.name ?? "Theme Preview";

  return [
    '<div class="wpsc-theme-preview">',
    `<div class="wpsc-theme-preview__label">${escapeHtml(themeName)}</div>`,
    body,
    "</div>"
  ].join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
