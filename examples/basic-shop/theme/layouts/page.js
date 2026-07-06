export default function pageLayout({ components, content, route, html }) {
  if (content.data.uiDemo === true) {
    return renderUiStorefrontDemo({ content, html, route });
  }

  return html`
    <main class="page-view">
      <p class="eyebrow">${components.label("page")}</p>
      <h1>${content.title}</h1>
      <p class="description">${content.data.headline ?? content.data.description ?? ""}</p>
      ${renderHomeDemoLinks(route, html)}
      ${renderArchiveLinks(content, html)}
      <small class="meta">${route.path}</small>
    </main>
  `;
}

function renderUiStorefrontDemo({ content, html, route }) {
  const categories = [
    ["Tất cả", "/shop", true],
    ["Hộp giấy", "/hop-nap-cai-giay-ivory-300gsm-tsp07"],
    ["Decal", "/decal-giay-hinh-dang-dac-biet"],
    ["Catalogue", "/catalogue-a4-dung-bia-ruot-giay-couche-150gsm"],
    ["Tờ rơi", "/to-roi-a4-giay-couche-150gsm"]
  ];
  const signals = [
    ["Báo giá nhanh", "Theo quy cách in ấn"],
    ["Dữ liệu thật", "WP + WooCommerce"],
    ["Build thử", "Chỉ route demo"]
  ];
  const footerColumns = [
    ["Sản phẩm", "Hộp giấy, decal, catalogue, tờ rơi, túi giấy"],
    ["Hỗ trợ", "Báo giá, duyệt file, giao hàng, thanh toán"],
    ["Liên hệ", "Hotline, Zalo, email và địa chỉ sẽ nối dữ liệu thật"]
  ];

  return html`
    <main class="storefront-demo min-h-screen py-4 sm:py-6">
      <section class="storefront-container">
        <div class="overflow-hidden rounded-panel border border-[var(--storefront-line)] bg-[var(--storefront-surface)] shadow-storefront">
          <header class="bg-[var(--storefront-surface)]">
            <div class="flex flex-col gap-4 border-b border-[var(--storefront-line)] px-4 py-4 lg:flex-row lg:items-center lg:px-6">
              <a class="flex min-w-60 items-center gap-3 font-bold" href="/">
                <span class="grid size-11 shrink-0 place-items-center rounded-md bg-brand-600 text-sm text-white">TSP</span>
                <span class="min-w-0">
                  <span class="block truncate text-base">Tín Sinh Phát</span>
                  <span class="block truncate text-xs font-normal text-[var(--storefront-muted)]">In ấn và bao bì theo yêu cầu</span>
                </span>
              </a>
              <form class="flex min-w-0 flex-1" action="/shop">
                <input class="min-h-11 w-full rounded-l-md border border-[var(--storefront-line)] bg-transparent px-3 text-sm outline-none focus:border-brand-600" type="search" placeholder="Tìm hộp giấy, decal, catalogue..." aria-label="Tìm kiếm">
                <button class="storefront-button rounded-l-none px-5" type="submit">Tìm</button>
              </form>
              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <a class="storefront-button-secondary" href="/lien-he">Liên hệ</a>
                <a class="storefront-button" href="/shop">Sản phẩm</a>
              </div>
            </div>
            <nav class="flex gap-1 overflow-x-auto px-4 py-2 text-sm lg:px-6" aria-label="Danh mục demo">
              ${html.raw(categories.map(([label, href, active]) => `
                <a class="${active ? "bg-brand-50 font-bold text-brand-700" : "text-[var(--storefront-muted)]"} whitespace-nowrap rounded-md px-3 py-2" href="${escapeAttribute(href)}">${escapeText(label)}</a>
              `).join(""))}
            </nav>
          </header>

          <section class="grid gap-8 border-t border-[var(--storefront-line)] px-4 py-8 lg:grid-cols-[1.15fr_.85fr] lg:px-6 lg:py-10">
            <div class="space-y-6">
              <p class="storefront-kicker">Trang demo giao diện</p>
              <h1 class="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">${content.data.headline}</h1>
              <p class="max-w-2xl text-base leading-7 text-[var(--storefront-muted)]">${content.data.description}</p>
              <div class="flex flex-wrap gap-3">
                <a class="storefront-button" href="/shop">Duyệt sản phẩm</a>
                <a class="storefront-button-secondary" href="/data/routes/ui-storefront-demo.json">Xem JSON route</a>
              </div>
              <dl class="grid gap-3 sm:grid-cols-3">
                ${html.raw(signals.map(([title, description]) => `
                  <div class="rounded-md border border-[var(--storefront-line)] px-3 py-3">
                    <dt class="text-sm font-bold">${escapeText(title)}</dt>
                    <dd class="mt-1 text-xs leading-5 text-[var(--storefront-muted)]">${escapeText(description)}</dd>
                  </div>
                `).join(""))}
              </dl>
            </div>
            <aside class="rounded-panel border border-[var(--storefront-line)] bg-[var(--storefront-paper)] p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="storefront-kicker">Kiểm tra nhanh</p>
                  <h2 class="mt-2 text-xl font-bold">Storefront shell</h2>
                </div>
                <span class="rounded-md bg-brand-600 px-2 py-1 text-xs font-bold text-white">Demo</span>
              </div>
              <div class="mt-5 grid gap-3 text-sm">
                ${html.raw(renderMetric("Route", route.path))}
                ${html.raw(renderMetric("Build mode", "incremental"))}
                ${html.raw(renderMetric("Asset scan", "route only"))}
                ${html.raw(renderMetric("Dark mode", "global toggle"))}
              </div>
            </aside>
          </section>

          <footer class="border-t border-[var(--storefront-line)] px-4 py-5 lg:px-6">
            <div class="grid gap-4 text-sm text-[var(--storefront-muted)] lg:grid-cols-4">
              <div>
                <strong class="block text-[var(--storefront-ink)]">Tín Sinh Phát</strong>
                <span>Storefront footer demo trước khi áp dụng toàn site.</span>
              </div>
              ${html.raw(footerColumns.map(([title, text]) => `
                <div>
                  <strong class="block text-[var(--storefront-ink)]">${escapeText(title)}</strong>
                  <span>${escapeText(text)}</span>
                </div>
              `).join(""))}
            </div>
          </footer>
        </div>
      </section>
    </main>
  `;
}

function renderMetric(label, value) {
  return `
    <div class="flex items-center justify-between gap-4 rounded-md border border-[var(--storefront-line)] bg-[var(--storefront-surface)] px-3 py-2">
      <span class="text-[var(--storefront-muted)]">${escapeText(label)}</span>
      <strong class="text-right">${escapeText(value)}</strong>
    </div>
  `;
}

function renderHomeDemoLinks(route, html) {
  if (route.path !== "/") {
    return "";
  }

  return html.raw([
    '<div class="demo-actions" aria-label="Demo">',
    '<a class="demo-actions__primary" href="/builder.html">Mở Builder demo</a>',
    '<span class="demo-actions__hint">Dùng nút L/D trên header để kiểm tra dark mode.</span>',
    "</div>"
  ].join(""));
}

function renderArchiveLinks(content, html) {
  const links = content.data.archiveLinks ?? [];

  if (!Array.isArray(links) || links.length === 0) {
    return "";
  }

  return html.raw([
    '<nav class="archive-links" aria-label="Danh mục">',
    ...links.map((link) => `<a href="${escapeAttribute(link.href)}">${escapeText(link.label)}</a>`),
    "</nav>"
  ].join(""));
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
