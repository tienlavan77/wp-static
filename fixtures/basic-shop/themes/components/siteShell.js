import { renderFooter } from "./footer/footer.js";
import { renderMainHeader } from "./header/mainHeader.js";
import { renderTopHeader } from "./header/topHeader.js";
import { normalizeNavItems } from "./navigation/navItems.js";
import { renderWhyChooseUs } from "./sections/whyChooseUs.js";

export function renderPageShell(html, options = {}) {
  const banner = options.banner ?? null;
  const content = options.content ?? "";
  const activeHref = options.activeHref ?? "/";
  const navItems = normalizeNavItems(options.navItems);

  return html`
    <main class="storefront-shell">
      ${renderTopHeader(html, options)}
      ${renderMainHeader(html, {
        ...options,
        activeHref,
        navItems
      })}
      ${banner ? html.raw(banner) : ""}
      <section class="storefront-content">
        ${html.raw(content)}
      </section>
      ${options.showWhyChooseUs === false ? "" : renderWhyChooseUs(html)}
      ${renderFooter(html, options)}
    </main>
  `;
}
