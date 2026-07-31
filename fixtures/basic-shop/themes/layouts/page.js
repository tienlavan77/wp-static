import {
  createNavItemsFromCategories,
  escapeAttribute,
  escapeText,
  renderBanner,
  renderCategoryCard,
  renderPageShell,
  renderProductCard
} from "../components/storefrontShell.js";

export default function pageLayout({ content, graph, html, route }) {
  const categories = createHomeCategories(content, graph);
  const navItems = createNavItemsFromCategories(categories);

  if (route.path === "/") {
    return renderHomePage({ categories, content, graph, html, navItems });
  }

  if (content.data.notFoundPage) {
    return renderNotFoundPage({ categories, content, html, navItems, route });
  }

  return renderPage({ categories, content, html, navItems, route });
}

function renderHomePage({ categories, content, graph, html, navItems }) {
  const banner = renderBanner(html, {
    actions: [
      { href: "/checkout", label: "Đặt hàng ngay" },
      { href: "/lien-he", label: "Nhận báo giá" }
    ],
    description: "Áp dụng cho đơn hàng gửi trực tiếp qua website. Tư vấn nhanh, báo giá rõ ràng.",
    title: "Giảm 10% khi đặt hàng online",
    variant: "home"
  });
  const body = `
    <section class="storefront-section storefront-category-overview">
      <div class="storefront-container">
        <div class="storefront-section__heading">
          <h2>Danh mục sản phẩm</h2>
        </div>
        <div class="storefront-category-grid">
          ${categories.map((category) => renderCategoryCard(category)).join("")}
        </div>
      </div>
    </section>

    <div class="storefront-category-product-list">
      ${renderHomeCategorySections(categories)}
    </div>
  `;

  return renderPageShell(html, {
    activeHref: "/",
    banner,
    content: body,
    navItems,
    siteTitle: "Tín Sinh Phát"
  });
}

function renderHomeCategorySections(categories) {
  const folderIndex = categories.findIndex((category) => categoryMatches(category, "in folder"));
  const tagIndex = categories.findIndex((category) => categoryMatches(category, "in tag giay") || categoryMatches(category, "in tag giấy"));

  return categories.map((category, index) => {
    const shouldInsertBefore =
      (folderIndex !== -1 && tagIndex !== -1 && index === tagIndex && folderIndex < tagIndex) ||
      (folderIndex === -1 && tagIndex !== -1 && index === tagIndex);
    const shouldInsertAfter = folderIndex !== -1 && tagIndex === -1 && index === folderIndex;
    const section = renderHomeCategorySection(category);

    return `${shouldInsertBefore ? renderCategoryDivider() : ""}${section}${shouldInsertAfter ? renderCategoryDivider() : ""}`;
  }).join("");
}

function renderHomeCategorySection(category) {
  return `
    <section class="storefront-section storefront-category-products">
      <div class="storefront-container">
        <div class="storefront-section__heading storefront-section__heading--inline">
          <h2>${escapeText(category.label)}</h2>
          <a href="${escapeAttribute(category.href)}">Xem thêm</a>
        </div>
        <div class="storefront-product-grid">
          ${category.products.slice(0, 5).map((product) => renderProductCard(product)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderCategoryDivider() {
  const services = [
    {
      description: "Đặt hàng trực tuyến trên website, bạn chỉ cần đặt hàng và chuyển file in.",
      icon: "https://tinsinhphuc.com/wp-content/uploads/2021/06/5959201-128-1.png",
      title: "Đặt hàng online"
    },
    {
      description: "Thanh toán bằng hình thức chuyển khoản, ATM, VISA Card, Master Card.",
      icon: "https://tinsinhphuc.com/wp-content/uploads/2021/06/3669335-128-1.png",
      title: "Thanh toán trực tuyến"
    },
    {
      description: "Giao hàng bằng các hình thức trực tiếp đến địa chỉ khách hàng.",
      icon: "https://tinsinhphuc.com/wp-content/uploads/2021/06/2703076-128-1-1.png",
      title: "Giao hàng tận nơi"
    }
  ];

  return `
    <section class="storefront-service-strip">
      <div class="storefront-service-strip__bg">
        <div class="storefront-service-strip__overlay"></div>
      </div>
      <div class="storefront-container storefront-service-strip__content">
        <div class="storefront-service-strip__row">
          ${services.map((service, index) => `
            <div class="storefront-service-strip__col${index < services.length - 1 ? " storefront-service-strip__col--divided" : ""}">
              <article class="storefront-icon-box">
                <div class="storefront-icon-box__image">
                  <img src="${escapeAttribute(service.icon)}" alt="" width="128" height="128" loading="lazy" decoding="async">
                </div>
                <div class="storefront-icon-box__text">
                  <h3>${escapeText(service.title)}</h3>
                  <p>${escapeText(service.description)}</p>
                </div>
              </article>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function categoryMatches(category, expected) {
  const haystack = normalizeCategoryName(`${category.label ?? ""} ${category.slug ?? ""} ${category.href ?? ""}`);
  const needle = normalizeCategoryName(expected);

  return haystack.includes(needle);
}

function normalizeCategoryName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function renderPage({ categories, content, html, navItems, route }) {
  const banner = renderBanner(html, {
    breadcrumbs: [{ href: "/", label: "Trang chủ" }, { label: content.title }],
    description: content.data.headline ?? content.data.description ?? "",
    eyebrow: "Trang",
    title: content.title
  });
  const body = `
    <article class="storefront-container storefront-prose">
      ${content.content ?? content.data.content ?? content.data.description ?? ""}
    </article>
  `;

  return renderPageShell(html, {
    activeHref: route.path,
    banner,
    content: body,
    navItems,
    notice: categories.length > 0 ? `${categories.length} danh mục sản phẩm đang sẵn sàng` : undefined,
    siteTitle: "Tín Sinh Phát"
  });
}

function renderNotFoundPage({ categories, content, html, navItems, route }) {
  const body = `
    <section class="storefront-not-found">
      <div class="storefront-container storefront-not-found__inner">
        <div class="storefront-not-found__mark">404</div>
        <div class="storefront-not-found__content">
          <p class="storefront-kicker">Không tìm thấy</p>
          <h1>${escapeText(content.title)}</h1>
          <p>${escapeText(content.data.description)}</p>
          <form class="storefront-search storefront-not-found__search" action="/search" data-storefront-search-form>
            <input type="search" name="s" placeholder="Tìm sản phẩm, danh mục..." aria-label="Tìm kiếm">
            <button type="submit">Tìm</button>
          </form>
          <div class="storefront-not-found__actions">
            <a class="storefront-button" href="/">Về trang chủ</a>
            <a class="storefront-button-secondary" href="/shop">Xem sản phẩm</a>
          </div>
        </div>
      </div>
      <div class="storefront-container storefront-not-found__suggestions">
        <h2>Danh mục có thể anh cần</h2>
        <div class="storefront-category-grid">
          ${categories.slice(0, 4).map((category) => renderCategoryCard(category)).join("")}
        </div>
      </div>
    </section>
  `;

  return renderPageShell(html, {
    activeHref: route.path,
    content: body,
    navItems,
    showWhyChooseUs: false,
    siteTitle: "Tín Sinh Phát"
  });
}

function createHomeCategories(content, graph) {
  const explicitLinks = content.data.archiveLinks;

  if (Array.isArray(explicitLinks) && explicitLinks.length > 0) {
    return explicitLinks.map((link) => ({
      href: link.href,
      label: link.label
    }));
  }

  const products = (graph?.contents?.items ?? []).filter((item) => item.type === "product");

  return (graph?.terms?.items ?? [])
    .filter((term) => term.taxonomy === "product_cat" && term.parentId !== null && term.parentId !== undefined)
    .map((term) => {
      const categoryProducts = findProductsByCategory(products, term);

      return {
        count: categoryProducts.length,
        href: term.path ?? `/${term.slug}`,
        image: getCategoryImage(term, categoryProducts),
        label: term.name,
        products: categoryProducts
      };
    })
    .filter((category) => category.count > 0);
}

function findProductsByCategory(products, category) {
  return products.filter((product) => {
    const terms = [
      ...(product.data?.terms ?? []),
      ...(product.data?.categories ?? [])
    ];

    return terms.some((term) => {
      const sameId = term.id !== undefined && category.id !== undefined && String(term.id) === String(category.id);
      const sameSlug = term.slug && category.slug && term.slug === category.slug;

      return sameId || sameSlug;
    });
  });
}

function getCategoryImage(category, products) {
  return normalizeImageUrl(
    category.image ??
    category.thumbnail ??
    category.data?.image ??
    category.data?.thumbnail ??
    products[0]?.data?.featuredImage ??
    products[0]?.data?.images?.[0]
  );
}

function normalizeImageUrl(image) {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return image.sourceUrl ?? image.src ?? image.url ?? "";
}

function formatProductCount(count) {
  return `${count} sản phẩm`;
}
