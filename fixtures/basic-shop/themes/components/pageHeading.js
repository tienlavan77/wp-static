import { renderBreadcrumbs } from "./navigation/breadcrumbs.js";
import { escapeAttribute, escapeText } from "./shared/html.js";

export function renderPageHeading(options = {}) {
  const breadcrumbs = Array.isArray(options.breadcrumbs) ? options.breadcrumbs : [];
  const className = options.className ?? "storefront-cart-heading";
  const kicker = options.kicker ?? "";
  const title = options.title ?? "";
  const backgroundImage = options.backgroundImage ?? "";
  const style = backgroundImage ? ` style="--storefront-page-heading-image: url('${escapeStyleUrl(backgroundImage)}')"` : "";

  return `
    <header class="${escapeAttribute(className)}"${style}>
      <div class="${escapeAttribute(className)}__bg" aria-hidden="true"></div>
      <div class="${escapeAttribute(className)}__content">
        ${breadcrumbs.length > 0 ? renderBreadcrumbs(breadcrumbs) : ""}
        ${kicker ? `<p class="storefront-kicker">${escapeText(kicker)}</p>` : ""}
        <h1>${escapeText(title)}</h1>
      </div>
    </header>
  `;
}

function escapeStyleUrl(value) {
  return escapeAttribute(value).replaceAll("'", "\\'");
}
