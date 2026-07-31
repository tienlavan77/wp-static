import { escapeAttribute, escapeText } from "../shared/html.js";

export function renderCheckoutProgress(currentStep = "cart") {
  const steps = [
    { href: "/cart", key: "cart", label: "Giỏ hàng", number: "1" },
    { href: "/checkout", key: "checkout", label: "Thanh toán", number: "2" },
    { href: "#", key: "complete", label: "Hoàn tất", number: "3" }
  ];

  return `
    <div class="storefront-checkout-steps-wrap">
      <nav class="storefront-checkout-steps" aria-label="Tiến trình đặt hàng">
        ${steps.map((step, index) => `
          ${index > 0 ? `<span class="storefront-checkout-divider" aria-hidden="true">›</span>` : ""}
          <a class="${step.key === currentStep ? "is-current" : step.key === "complete" && currentStep !== "complete" ? "is-disabled" : ""}" href="${escapeAttribute(step.href)}">
            <span class="storefront-checkout-step">${escapeText(step.number)}</span>
            ${escapeText(step.label)}
          </a>
        `).join("")}
      </nav>
    </div>
  `;
}
