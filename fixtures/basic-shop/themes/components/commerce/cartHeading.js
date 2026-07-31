import { escapeText } from "../shared/html.js";

export function renderCartHeading(options = {}) {
  const extraClass = options.extraClass ? ` ${options.extraClass}` : "";
  const kicker = options.kicker ?? "";
  const title = options.title ?? "";

  return `
    <header class="storefront-cart-heading${extraClass}">
      <div class="storefront-cart-heading__bg" aria-hidden="true"></div>
      <div class="storefront-cart-heading__content">
        ${kicker ? `<p class="storefront-kicker">${escapeText(kicker)}</p>` : ""}
        <h1>${escapeText(title)}</h1>
      </div>
    </header>
  `;
}
