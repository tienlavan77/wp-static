import { escapeText } from "../shared/html.js";

export function renderProductSpecPanel(content, data, categories) {
  return `
    <div class="storefront-product-info-grid">
      <article>
        <h3>Thông tin đặt in</h3>
        <p>Chọn đúng cấu hình sản phẩm, số lượng và thành phẩm trước khi thêm vào giỏ hàng để hệ thống ghi nhận báo giá chính xác.</p>
        <ul>
          <li>File thiết kế nên gửi ở định dạng PDF, AI, CDR hoặc file ảnh độ phân giải cao.</li>
          <li>Nội dung in cần được kiểm tra kỹ trước khi xác nhận sản xuất.</li>
          <li>Đội ngũ Tín Sinh Phát sẽ liên hệ nếu file cần căn chỉnh hoặc thiếu thông tin.</li>
        </ul>
      </article>
      <article>
        <h3>Chi tiết nhanh</h3>
        <dl class="storefront-product-tab-meta">
          ${data.sku ? `<div><dt>SKU</dt><dd>${escapeText(data.sku)}</dd></div>` : ""}
          <div><dt>Sản phẩm</dt><dd>${escapeText(content.title)}</dd></div>
          ${categories.length > 0 ? `<div><dt>Danh mục</dt><dd>${categories.map((category) => escapeText(category.label)).join(", ")}</dd></div>` : ""}
          <div><dt>Tư vấn</dt><dd>Kiểm tra file, báo giá và xác nhận trước khi in.</dd></div>
        </dl>
      </article>
    </div>
  `;
}

export function renderProductShippingPanel() {
  return `
    <div class="storefront-product-info-grid storefront-product-info-grid--compact">
      <article>
        <h3>Giao hàng</h3>
        <p>Đơn hàng sau khi xác nhận sẽ được sản xuất theo lịch hẹn. Khách có thể nhận tại xưởng hoặc giao nội thành.</p>
        <ul>
          <li>Nhận tại xưởng: miễn phí.</li>
          <li>Giao nội thành: tính phí theo khu vực hoặc theo cấu hình checkout.</li>
          <li>Đơn cần gấp sẽ được tư vấn thời gian riêng trước khi sản xuất.</li>
        </ul>
      </article>
      <article>
        <h3>Thanh toán</h3>
        <p>Hỗ trợ chuyển khoản ngân hàng, thanh toán theo báo giá hoặc xác nhận riêng với nhân viên phụ trách.</p>
        <ul>
          <li>QR chuyển khoản hiển thị sau khi gửi đơn hàng.</li>
          <li>Nội dung chuyển khoản gồm mã đơn để đối soát nhanh.</li>
          <li>Hóa đơn/chứng từ sẽ được hỗ trợ theo yêu cầu.</li>
        </ul>
      </article>
    </div>
  `;
}

export function renderProductSupportPanel() {
  return `
    <div class="storefront-product-support-panel">
      <div>
        <h3>Cần tư vấn trước khi đặt?</h3>
        <p>Gửi yêu cầu báo giá nếu bạn chưa chắc về chất liệu, kích thước, số lượng hoặc thành phẩm. Tín Sinh Phát sẽ kiểm tra và tư vấn cấu hình phù hợp.</p>
      </div>
      <div class="storefront-action-row">
        <a class="storefront-button" href="/lien-he">Liên hệ tư vấn</a>
        <a class="storefront-button-secondary" href="/checkout">Đặt hàng online</a>
      </div>
    </div>
  `;
}
