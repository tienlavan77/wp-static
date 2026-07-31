import {
  createNavItemsFromCategories,
  renderAccountShellPlaceholder,
  renderCartHeading,
  renderPageShell
} from "../components/storefrontShell.js";

export default function accountLayout({ graph, html, route }) {
  const navItems = createNavItemsFromCategories(createNavCategories(graph));
  const body = `
    <section class="storefront-account-page" data-account-page>
      <div class="storefront-container">
        ${renderCartHeading({ extraClass: "storefront-account-heading", kicker: "Khách hàng", title: "Tài khoản" })}
        ${renderAccountShellPlaceholder()}
      </div>
    </section>
  `;

  return renderPageShell(html, {
    activeHref: route.path,
    content: body,
    navItems,
    showWhyChooseUs: false,
    siteTitle: "Tín Sinh Phát"
  });
}

function createNavCategories(graph) {
  return (graph?.terms?.items ?? [])
    .filter((term) => term.taxonomy === "product_cat")
    .slice(0, 6)
    .map((term) => ({
      href: term.path ?? `/${term.slug}`,
      label: term.name ?? term.slug
    }));
}
