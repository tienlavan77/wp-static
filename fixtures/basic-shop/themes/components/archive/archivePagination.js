import { escapeAttribute, escapeText } from "../shared/html.js";

export function renderPagination(pagination, routePath) {
  const page = pagination.page ?? 1;
  const pageCount = pagination.pageCount ?? 1;

  if (pageCount <= 1) {
    return "";
  }

  const basePath = routePath.replace(/\/page\/\d+\/?$/, "");
  const previousPath = page <= 2 ? basePath : `${basePath}/page/${page - 1}`;
  const nextPath = `${basePath}/page/${page + 1}`;

  return `
    <div class="storefront-pagination-wrap">
      ${page < pageCount ? `<a class="storefront-pagination-more" href="${escapeAttribute(nextPath)}">Xem thêm sản phẩm</a>` : ""}
      <nav class="storefront-pagination" aria-label="Phân trang sản phẩm">
        ${page > 1 ? `<a href="${escapeAttribute(previousPath)}">Trước</a>` : `<span class="is-disabled">Trước</span>`}
        <strong aria-current="page">Trang ${escapeText(page)} / ${escapeText(pageCount)}</strong>
        ${page < pageCount ? `<a href="${escapeAttribute(nextPath)}">Sau</a>` : `<span class="is-disabled">Sau</span>`}
      </nav>
    </div>
  `;
}

export function createPaginationSummary(pagination, fallbackCount) {
  const totalItems = pagination.totalItems ?? fallbackCount;
  const page = pagination.page ?? 1;
  const pageCount = pagination.pageCount ?? 1;

  if (pageCount <= 1) {
    return formatProductCount(totalItems);
  }

  return `${formatProductCount(totalItems)} - trang ${page}/${pageCount}`;
}

export function formatProductCount(count) {
  return `${count} sản phẩm`;
}
