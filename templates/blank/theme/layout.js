export default function layout({ content, html }) {
  return html`
    <main>
      <h1>${content.title}</h1>
      <p>${content.data.description ?? ""}</p>
    </main>
  `;
}
