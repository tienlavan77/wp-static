export { renderAccountShellPlaceholder } from "./account/accountShellPlaceholder.js";
export { renderArchiveDescription } from "./archive/archiveDescription.js";
export { createPaginationSummary, formatProductCount, renderPagination } from "./archive/archivePagination.js";
export { renderArchiveToolbar } from "./archive/archiveToolbar.js";
export { renderBanner } from "./banner.js";
export { renderCategoryCard } from "./category/categoryCard.js";
export { renderCategoryGrid } from "./category/categoryGrid.js";
export { renderCartHeading } from "./commerce/cartHeading.js";
export { renderCheckoutProgress } from "./commerce/checkoutProgress.js";
export { renderFooter } from "./footer/footer.js";
export { renderMainHeader } from "./header/mainHeader.js";
export { renderTopHeader } from "./header/topHeader.js";
export { renderBreadcrumbs } from "./navigation/breadcrumbs.js";
export { createNavItemsFromCategories, normalizeNavItems } from "./navigation/navItems.js";
export { renderPageHeading } from "./pageHeading.js";
export { renderProductCard } from "./product/productCard.js";
export { renderProductGrid } from "./product/productGrid.js";
export { renderProductShippingPanel, renderProductSpecPanel, renderProductSupportPanel } from "./product/productInfoPanels.js";
export { renderQuoteTable } from "./product/quoteTable.js";
export { renderVariantOptions } from "./product/variationPicker.js";
export { renderPageShell } from "./siteShell.js";
export { renderServiceStrip } from "./sections/serviceStrip.js";
export { renderWhyChooseUs } from "./sections/whyChooseUs.js";
export { formatPrice, formatProductPrice, getProductSortPrice } from "./shared/format.js";
export { escapeAttribute, escapeText, stripHtml } from "./shared/html.js";
export { normalizeImageUrl } from "./shared/image.js";

export default {
  label(value) {
    return value;
  },

  price(value, currency) {
    if (typeof value !== "number") {
      return "";
    }

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency ?? "VND"
    }).format(value);
  }
};
