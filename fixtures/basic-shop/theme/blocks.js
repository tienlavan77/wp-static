const themeBlocks = [
  {
    name: "theme/badge",
    label: "Theme Badge",
    category: "theme",
    props: {
      text: {
        default: "Basic Commerce Theme",
        label: "Text",
        type: "string"
      }
    },
    render({ html, props }) {
      return html`<p class="theme-badge">${props.text}</p>`;
    }
  },
  {
    name: "core/heading",
    label: "Theme Heading",
    category: "theme",
    props: {
      level: {
        default: 2,
        label: "Level",
        type: "number"
      },
      text: {
        label: "Text",
        required: true,
        type: "string"
      }
    },
    render({ html, props }) {
      const level = Math.min(6, Math.max(1, Math.trunc(props.level)));

      return html.raw(`<h${level} class="theme-heading">${escapeHtml(props.text)}</h${level}>`);
    }
  }
];

export default themeBlocks;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
