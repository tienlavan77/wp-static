import { renderBanner } from "./banner.js";
import { renderProductCard } from "./product/productCard.js";
import { escapeAttribute, escapeText, stripHtml } from "./shared/html.js";
import { renderBreadcrumbs } from "./navigation/breadcrumbs.js";

export { escapeAttribute, escapeText, stripHtml } from "./shared/html.js";
export { renderBanner } from "./banner.js";
export { renderPageHeading } from "./pageHeading.js";
export { renderArchiveDescription } from "./archive/archiveDescription.js";
export { createPaginationSummary, formatProductCount, renderPagination } from "./archive/archivePagination.js";
export { renderArchiveToolbar } from "./archive/archiveToolbar.js";
export { renderBreadcrumbs } from "./navigation/breadcrumbs.js";
export { createNavItemsFromCategories } from "./navigation/navItems.js";
export { renderCategoryCard } from "./category/categoryCard.js";
export { renderCategoryGrid } from "./category/categoryGrid.js";
export { renderAccountShellPlaceholder } from "./account/accountShellPlaceholder.js";
export { renderCartHeading } from "./commerce/cartHeading.js";
export { renderCheckoutProgress } from "./commerce/checkoutProgress.js";
export { renderProductCard } from "./product/productCard.js";
export { renderProductGrid } from "./product/productGrid.js";
export { renderProductShippingPanel, renderProductSpecPanel, renderProductSupportPanel } from "./product/productInfoPanels.js";
export { renderQuoteTable } from "./product/quoteTable.js";
export { renderVariantOptions } from "./product/variationPicker.js";
export { renderServiceStrip } from "./sections/serviceStrip.js";
export { renderWhyChooseUs } from "./sections/whyChooseUs.js";
export { renderPageShell } from "./siteShell.js";

function normalizeNavItems(items = []) {
  const normalized = Array.isArray(items) && items.length > 0
    ? items
    : [{ href: "/", label: "Trang chủ" }, { href: "/shop", label: "Sản phẩm" }, { href: "/lien-he", label: "Liên hệ" }];

  return normalized.filter((item) => item.href && item.label);
}
