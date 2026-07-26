import { renderBreadcrumbs } from "./navigation/breadcrumbs.js";
import { escapeAttribute, escapeText } from "./shared/html.js";

export function renderBanner(html, options = {}) {
  const eyebrow = options.eyebrow ?? "";
  const title = options.title ?? "";
  const description = options.description ?? "";
  const breadcrumbs = Array.isArray(options.breadcrumbs) ? options.breadcrumbs : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const variantClass = options.variant ? ` storefront-banner--${escapeAttribute(options.variant)}` : "";

  return `
    <section class="storefront-banner${variantClass}">
      <div class="storefront-banner__bg" aria-hidden="true"></div>
      <div class="storefront-container storefront-banner__layers">
        <div class="storefront-banner__text-box">
          ${breadcrumbs.length > 0 ? renderBreadcrumbs(breadcrumbs) : ""}
          ${eyebrow ? `<p class="storefront-kicker">${escapeText(eyebrow)}</p>` : ""}
          <h2 class="storefront-banner__title">${escapeText(title)}</h2>
          ${description ? `<p>${escapeText(description)}</p>` : ""}
          ${actions.length > 0 ? `
            <div class="storefront-banner__actions">
              ${actions.map((action, index) => `
                <a class="${index === 0 ? "storefront-button" : "storefront-button-secondary"}" href="${escapeAttribute(action.href)}">${escapeText(action.label)}</a>
              `).join("")}
            </div>
          ` : ""}
        </div>
      </div>
    </section>
  `;
}
