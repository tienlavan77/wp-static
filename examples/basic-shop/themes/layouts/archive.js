import {
  createNavItemsFromCategories,
  createPaginationSummary,
  escapeAttribute,
  escapeText,
  formatProductCount,
  renderCategoryCard,
  renderArchiveDescription,
  renderArchiveToolbar,
  renderPageShell,
  renderPagination,
  renderProductCard
} from "../components/storefrontShell.js";

export default function archiveLayout({ content, graph, html, route }) {
  const archive = content.data?.archive ?? {};
  const term = archive.term ?? content.data?.term ?? {};
  const products = archive.items ?? content.data?.items ?? [];
  const allProducts = (graph?.contents?.items ?? []).filter((item) => item.type === "product");
  const childCategories = findChildCategories(term, graph, allProducts);
  const navItems = createNavItemsFromCategories(createNavCategories(graph));
  const description = getTermDescription(term, content);
  const plainDescription = stripHtml(description);
  const termImage = normalizeImageUrl(term.image ?? term.data?.image);
  const termName = term.name ?? content.title?.replace(/^Product Category:\s*/i, "") ?? "Danh mục";
  const breadcrumbs = createTermBreadcrumbs(term, graph, termName);
  const pagination = archive.pagination ?? content.data?.pagination ?? {};
  const totalProducts = pagination.totalItems ?? products.length;
  const schema = createArchiveSchema({ breadcrumbs, description: plainDescription, products, route, termImage, termName, totalProducts });
  const body = `
    <section class="storefront-archive">
      <div class="storefront-container">
        <nav class="storefront-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Trang chủ</a>
          ${breadcrumbs.map((item, index) => index === breadcrumbs.length - 1
            ? `<span>${escapeText(item.label)}</span>`
            : `<a href="${escapeAttribute(item.href)}">${escapeText(item.label)}</a>`
          ).join("")}
        </nav>

        <header class="storefront-archive__header"${termImage ? ` style="--storefront-archive-image: url('${escapeStyleUrl(termImage)}')"` : ""}>
          ${termImage ? `<div class="storefront-archive__bg" aria-hidden="true"></div>` : ""}
          <div class="storefront-archive__intro">
            <div>
              <p class="storefront-kicker">Danh mục sản phẩm</p>
              <h1>${escapeText(termName)}</h1>
              ${plainDescription ? `<p class="storefront-archive__lead">${escapeText(truncateText(plainDescription, 180))}</p>` : ""}
            </div>
            <div class="storefront-archive__badges" aria-label="Thông tin danh mục">
              <span>${escapeText(formatProductCount(totalProducts))}</span>
              ${childCategories.length > 0 ? `<span>${escapeText(childCategories.length)} danh mục con</span>` : ""}
            </div>
          </div>
        </header>

        ${childCategories.length > 0 ? `
          <section class="storefront-archive__children" aria-label="Danh mục con">
            <div class="storefront-section__heading storefront-section__heading--inline">
              <div>
                <h2>Danh mục con</h2>
                <p>Chọn nhóm sản phẩm hẹp hơn để xem đúng mẫu in cần đặt.</p>
              </div>
            </div>
            <div class="storefront-category-grid storefront-category-grid--archive">
            ${childCategories.map((category) => renderCategoryCard(category, { cta: "Xem danh mục" })).join("")}
            </div>
          </section>
        ` : ""}

        ${renderArchiveToolbar(createPaginationSummary(pagination, products.length))}

        <section class="storefront-archive__products" aria-label="Sản phẩm trong danh mục">
          <div class="storefront-archive__products-heading">
            <div>
              <p class="storefront-kicker">Sản phẩm</p>
              <h2>${escapeText(termName)}</h2>
            </div>
            <span>${escapeText(createPaginationSummary(pagination, products.length))}</span>
          </div>
          ${products.length > 0 ? `
            <div class="storefront-product-grid storefront-product-grid--archive" data-storefront-product-grid>
              ${products.map((product) => renderProductCard(product, { showCategory: true })).join("")}
            </div>
          ` : `
            <div class="storefront-archive-empty">
              <h3>Chưa có sản phẩm trong danh mục này</h3>
              <p>Anh có thể quay lại danh mục cha hoặc liên hệ Tín Sinh Phát để được tư vấn sản phẩm in phù hợp.</p>
              <a class="storefront-button" href="/lien-he">Nhận tư vấn</a>
            </div>
          `}
        </section>

        ${renderPagination(pagination, route.path)}

        ${description ? renderArchiveDescription(description) : ""}
        <script type="application/ld+json">${escapeText(JSON.stringify(schema))}</script>
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

function createArchiveSchema({ breadcrumbs, description, products, route, termImage, termName, totalProducts }) {
  const schemaDescription = truncateText(description, 520);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        description: schemaDescription,
        image: termImage || undefined,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: products.slice(0, 12).map((product, index) => ({
            "@type": "ListItem",
            item: product.path ?? `/${product.slug}`,
            name: product.title,
            position: index + 1
          })),
          numberOfItems: totalProducts
        },
        name: termName,
        url: route.path
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", item: "/", name: "Trang chủ", position: 1 },
          ...breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            item: item.href || route.path,
            name: item.label,
            position: index + 2
          }))
        ]
      }
    ]
  };
}

function createTermBreadcrumbs(term, graph, fallbackLabel) {
  const ancestors = findTermAncestors(term, graph);
  const current = {
    href: term.path ?? `/${term.slug}`,
    label: term.name ?? term.label ?? fallbackLabel
  };

  return [
    ...ancestors.map((ancestor) => ({
      href: ancestor.path ?? `/${ancestor.slug}`,
      label: ancestor.name ?? ancestor.label ?? ancestor.slug
    })),
    current
  ].filter((item) => item.href && item.label);
}

function findTermAncestors(term, graph) {
  const terms = graph?.terms?.items ?? [];
  const ancestors = [];
  let current = term;
  const seen = new Set();

  while (current) {
    const parent = findParentTerm(current, terms);

    if (!parent) {
      break;
    }

    const key = `${parent.taxonomy ?? ""}:${parent.id ?? parent.slug}`;
    if (seen.has(key)) {
      break;
    }

    ancestors.unshift(parent);
    seen.add(key);
    current = parent;
  }

  return ancestors;
}

function findParentTerm(term, terms) {
  return terms.find((candidate) => {
    const sameTaxonomy = !candidate.taxonomy || !term.taxonomy || candidate.taxonomy === term.taxonomy;
    const sameParentId = term.parentId !== undefined && candidate.id !== undefined && String(term.parentId) === String(candidate.id);
    const sameParentSlug = term.parentSlug && candidate.slug && term.parentSlug === candidate.slug;

    return sameTaxonomy && (sameParentId || sameParentSlug);
  });
}

function findChildCategories(term, graph, products) {
  if (!term?.id && !term?.slug) {
    return [];
  }

  return (graph?.terms?.items ?? [])
    .filter((candidate) => candidate.taxonomy === term.taxonomy && isChildTerm(candidate, term))
    .map((candidate) => ({
      count: countProductsForTermAndDescendants(products, candidate, graph),
      href: candidate.path ?? `/${candidate.slug}`,
      image: normalizeImageUrl(candidate.image ?? candidate.data?.image),
      label: candidate.name ?? candidate.label ?? candidate.slug
    }))
    .filter((candidate) => candidate.count > 0);
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

function isChildTerm(candidate, parent) {
  const sameParentId = candidate.parentId !== undefined && parent.id !== undefined && String(candidate.parentId) === String(parent.id);
  const sameParentSlug = candidate.parentSlug && parent.slug && candidate.parentSlug === parent.slug;

  return sameParentId || sameParentSlug;
}

function countProductsForTerm(products, term) {
  return products.filter((product) => productHasTerm(product, term)).length;
}

function countProductsForTermAndDescendants(products, term, graph) {
  const terms = [
    term,
    ...findDescendantTerms(term, graph)
  ];

  return products.filter((product) => terms.some((candidate) => productHasTerm(product, candidate))).length;
}

function findDescendantTerms(term, graph) {
  const descendants = [];
  const queue = [term];

  while (queue.length > 0) {
    const parent = queue.shift();
    const children = (graph?.terms?.items ?? []).filter((candidate) => {
      return candidate.taxonomy === parent.taxonomy && isChildTerm(candidate, parent);
    });

    descendants.push(...children);
    queue.push(...children);
  }

  return descendants;
}

function productHasTerm(product, term) {
  const terms = [
    ...(product.data?.terms ?? []),
    ...(product.data?.categories ?? [])
  ];

  return terms.some((candidate) => {
    const sameTaxonomy = !candidate.taxonomy || !term.taxonomy || candidate.taxonomy === term.taxonomy;
    const sameId = candidate.id !== undefined && term.id !== undefined && String(candidate.id) === String(term.id);
    const sameSlug = candidate.slug && term.slug && candidate.slug === term.slug;

    return sameTaxonomy && (sameId || sameSlug);
  });
}

function getTermDescription(term, content) {
  const rawDescription = String(
    term.description ??
    term.data?.description ??
    content.excerpt ??
    content.data?.description ??
    ""
  );
  const textDescription = stripHtml(rawDescription);

  if (/^\d+\s+item\(s\)\s+in\s+/i.test(textDescription) || /^\d+\s+sản phẩm trong danh mục\s+/i.test(textDescription)) {
    return "";
  }

  return rawDescription;
}

function truncateText(value, maxLength) {
  const text = String(value ?? "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? ""))
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
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

function escapeStyleUrl(value) {
  return escapeAttribute(value).replaceAll("'", "\\'");
}
