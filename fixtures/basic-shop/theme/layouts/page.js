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
  return html`
    <main class="storefront-demo min-h-screen py-6">
      <section class="storefront-container">
        <div class="storefront-panel overflow-hidden">
          <header class="border-b border-[var(--storefront-line)] bg-[var(--storefront-surface)]">
            <div class="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <a class="flex items-center gap-3 font-bold" href="/">
                <span class="grid size-10 place-items-center rounded-md bg-brand-600 text-sm text-white">TSP</span>
                <span>
                  <span class="block text-base">Tín Sinh Phát</span>
                  <span class="block text-xs font-normal text-[var(--storefront-muted)]">In ấn và bao bì theo yêu cầu</span>
                </span>
              </a>
              <form class="flex min-w-0 flex-1 lg:max-w-xl" action="/shop">
                <input class="min-h-10 w-full rounded-l-md border border-[var(--storefront-line)] bg-transparent px-3 text-sm outline-none" type="search" placeholder="Tìm hộp giấy, decal, catalogue..." aria-label="Tìm kiếm">
                <button class="storefront-button rounded-l-none" type="submit">Tìm</button>
              </form>
              <div class="flex flex-wrap items-center gap-2">
                <a class="storefront-button-secondary" href="/lien-he">Liên hệ</a>
                <a class="storefront-button" href="/shop">Xem sản phẩm</a>
              </div>
            </div>
            <nav class="flex gap-1 overflow-x-auto border-t border-[var(--storefront-line)] px-4 py-2 text-sm lg:px-6" aria-label="Danh mục demo">
              <a class="rounded-md px-3 py-2 font-bold text-[var(--storefront-brand-strong)]" href="/shop">Tất cả</a>
              <a class="rounded-md px-3 py-2 text-[var(--storefront-muted)]" href="/hop-nap-cai-giay-ivory-300gsm-tsp07">Hộp giấy</a>
              <a class="rounded-md px-3 py-2 text-[var(--storefront-muted)]" href="/decal-giay-hinh-dang-dac-biet">Decal</a>
              <a class="rounded-md px-3 py-2 text-[var(--storefront-muted)]" href="/catalogue-a4-dung-bia-ruot-giay-couche-150gsm">Catalogue</a>
            </nav>
          </header>

          <section class="grid gap-6 px-4 py-8 lg:grid-cols-[1.2fr_.8fr] lg:px-6 lg:py-10">
            <div class="space-y-5">
              <p class="storefront-kicker">Trang demo giao diện</p>
              <h1 class="text-3xl font-bold leading-tight sm:text-5xl">${content.data.headline}</h1>
              <p class="max-w-2xl text-base leading-7 text-[var(--storefront-muted)]">${content.data.description}</p>
              <div class="flex flex-wrap gap-3">
                <a class="storefront-button" href="/shop">Duyệt sản phẩm</a>
                <a class="storefront-button-secondary" href="/data/routes/ui-storefront-demo.json">Xem JSON route</a>
              </div>
            </div>
            <aside class="storefront-panel p-4 shadow-none">
              <p class="storefront-kicker">Kiểm tra nhanh</p>
              <div class="mt-4 grid gap-3 text-sm">
                <div class="flex items-center justify-between rounded-md border border-[var(--storefront-line)] px-3 py-2">
                  <span>Route</span>
                  <strong>${route.path}</strong>
                </div>
                <div class="flex items-center justify-between rounded-md border border-[var(--storefront-line)] px-3 py-2">
                  <span>Build mode</span>
                  <strong>incremental</strong>
                </div>
                <div class="flex items-center justify-between rounded-md border border-[var(--storefront-line)] px-3 py-2">
                  <span>Dark mode</span>
                  <strong>header toggle</strong>
                </div>
              </div>
            </aside>
          </section>

          <footer class="grid gap-4 border-t border-[var(--storefront-line)] px-4 py-5 text-sm text-[var(--storefront-muted)] lg:grid-cols-3 lg:px-6">
            <div>
              <strong class="block text-[var(--storefront-ink)]">Tín Sinh Phát</strong>
              <span>Storefront footer demo trước khi áp dụng toàn site.</span>
            </div>
            <div>
              <strong class="block text-[var(--storefront-ink)]">Danh mục</strong>
              <span>Hộp giấy, decal, catalogue, tờ rơi.</span>
            </div>
            <div>
              <strong class="block text-[var(--storefront-ink)]">Liên hệ</strong>
              <span>Hotline/Zalo/địa chỉ sẽ nối dữ liệu thật ở phase sau.</span>
            </div>
          </footer>
        </div>
      </section>
    </main>
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
