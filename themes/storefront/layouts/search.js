import {
  createNavItemsFromCategories,
  escapeText,
  renderBanner,
  renderPageShell
} from "../components/storefrontShell.js";

export default function searchLayout({ graph, html, route }) {
  const navItems = createNavItemsFromCategories(createNavCategories(graph));
  const banner = renderBanner(html, {
    breadcrumbs: [{ href: "/", label: "Trang chủ" }, { label: "Tìm kiếm" }],
    description: "Nhập tên sản phẩm, danh mục hoặc nội dung in ấn cần tìm.",
    eyebrow: "Tìm nhanh",
    title: "Tìm kiếm sản phẩm"
  });
  const body = `
    <section class="storefront-search-page" data-search-page>
      <div class="storefront-container">
        <form class="storefront-search-page__form" action="/search" data-search-page-form>
          <label>
            <span>Từ khóa</span>
            <input type="search" name="s" placeholder="Ví dụ: bao thư, folder, tag giấy..." data-search-page-input>
          </label>
          <button class="storefront-button" type="submit" data-search-page-submit>Tìm kiếm</button>
        </form>

        <div class="storefront-search-page__status" data-search-status>
          Nhập từ khóa để tìm sản phẩm và nội dung phù hợp.
        </div>

        <div class="storefront-search-page__filters" aria-label="Lọc loại kết quả">
          <button type="button" class="is-active" data-search-filter="all">Tất cả</button>
          <button type="button" data-search-filter="product">Sản phẩm</button>
          <button type="button" data-search-filter="archive">Danh mục</button>
          <button type="button" data-search-filter="page">Trang/Bài viết</button>
        </div>

        <div class="storefront-search-page__results" data-search-results>
          <article class="storefront-search-empty">
            <h2>${escapeText("Tìm đúng sản phẩm in nhanh hơn")}</h2>
            <p>Gợi ý: thử tìm theo tên sản phẩm, chất liệu, quy cách hoặc nhóm danh mục.</p>
          </article>
        </div>
      </div>
    </section>
  `;

  return renderPageShell(html, {
    activeHref: route.path,
    banner,
    content: body,
    navItems,
    showWhyChooseUs: false,
    siteTitle: "Tín Sinh Phát"
  });
}

function createNavCategories(graph) {
  return (graph?.terms?.items ?? [])
    .filter((term) => term.taxonomy === "product_cat")
    .slice(0, 6)
    .map((term) => ({
      href: term.path ?? `/${term.slug}`,
      label: term.name ?? term.slug
    }));
}
