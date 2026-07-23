export default function layout({ content, html }) {
  return html`
    <main>
      <p class="headline">${content.data.headline ?? content.type}</p>
      <h1>${content.title}</h1>
      <p>${content.data.description ?? ""}</p>
    </main>
  `;
}
