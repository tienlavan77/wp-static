import { escapeText } from "../shared/html.js";

export function renderWhyChooseUs(html) {
  const reasons = [
    {
      description: "Thường xuyên cập nhật các công nghệ in hiện đại, mang đến cho khách hàng ấn phẩm chất lượng cao và ấn tượng.",
      icon: "✓",
      title: "Chất lượng"
    },
    {
      description: "Tuân thủ tuyệt đối thời gian hoàn thành đã cam kết với khách hàng.",
      icon: "◷",
      title: "Thời gian"
    },
    {
      description: "Phương thức thanh toán linh hoạt: COD, chuyển khoản, cổng thanh toán trực tuyến, thẻ ATM nội địa, Visa, Master.",
      icon: "▣",
      title: "Thanh toán"
    },
    {
      description: "Hậu mãi tận tâm, chu đáo, thường xuyên có các chương trình khuyến mãi cho khách hàng cũ lẫn mới.",
      icon: "✦",
      title: "Hậu mãi"
    },
    {
      description: "Giao hàng đúng tiến độ, miễn phí hoặc có phí tùy theo điều kiện khách hàng. Phương thức giao hàng linh hoạt.",
      icon: "↗",
      title: "Giao hàng"
    },
    {
      description: "Hoàn tiền 100% nếu sản phẩm lỗi trong quá trình sản xuất, và quý khách không đồng ý in lại.",
      icon: "↺",
      title: "Hoàn tiền"
    }
  ];

  return html.raw(`
    <section class="storefront-why">
      <div class="storefront-why__bg" aria-hidden="true"></div>
      <div class="storefront-container storefront-why__inner">
        <div class="storefront-why__intro">
          <h2>Tại sao nên chọn <span>chúng tôi?</span></h2>
          <p>Trong hơn 20 năm qua, chúng tôi luôn tận tuỵ, nhiệt tâm mang đến dịch vụ tốt nhất cho khách hàng.</p>
          <div class="storefront-why__divider" aria-hidden="true"></div>
        </div>
        <div class="storefront-why__grid">
          ${reasons.map((reason) => `
            <article class="storefront-why-card">
              <div class="storefront-why-card__icon" aria-hidden="true">${escapeText(reason.icon)}</div>
              <div class="storefront-why-card__body">
                <h3>${escapeText(reason.title)}</h3>
                <p>${escapeText(reason.description)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `);
}
