import { escapeAttribute, escapeText } from "../shared/html.js";

export function renderServiceStrip() {
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
