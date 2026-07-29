import { escapeText } from "../shared/html.js";

export function renderArchiveToolbar(summary) {
  return `
    <div class="storefront-archive__toolbar">
      <div>
        <strong>${escapeText(summary)}</strong>
        <small>Chọn sản phẩm phù hợp rồi vào chi tiết để cấu hình đặt in.</small>
      </div>
      <label>
        <span>Sắp xếp</span>
        <select data-storefront-sort>
          <option value="default">Mặc định</option>
          <option value="price-asc">Giá thấp đến cao</option>
          <option value="price-desc">Giá cao đến thấp</option>
          <option value="newest">Mới nhất</option>
        </select>
      </label>
    </div>
  `;
}
