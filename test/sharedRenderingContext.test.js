import assert from "node:assert/strict";
import test from "node:test";
import createSharedRenderingContext from "../framework/src/theme/createSharedRenderingContext.js";
import renderPage from "../framework/src/builder/renderer/renderPage.js";

test("Shared Rendering Context composes Site services without Source access", () => {
  const content = { data: { excerpt: "Welcome" }, id: "page-1", slug: "welcome", title: "Welcome", type: "page" };
  const routing = {
    createCanonical: (pathname) => `https://site.example.test${pathname}`,
    notFoundPath: "/404",
    redirects: [{ from: "/old", status: 301, to: "/new" }]
  };
  const context = createSharedRenderingContext({
    content,
    graph: {
      media: { items: [{ id: "media-1" }] },
      menus: { items: [{ id: "primary" }] }
    },
    route: { content, path: "/welcome" },
    routing,
    site: { siteId: "site-a", title: "Site A", url: "https://site.example.test" },
    theme: { name: "storefront" }
  });

  assert.equal(context.schema, "wpsc.rendering-context");
  assert.equal(context.siteId, "site-a");
  assert.equal(context.navigation[0].id, "primary");
  assert.equal(context.media[0].id, "media-1");
  assert.equal(context.routing.canonical, "https://site.example.test/welcome");
  assert.equal(context.seo.canonical, "https://site.example.test/welcome");
  assert.equal(Object.hasOwn(context, "source"), false);
  assert.equal(Object.hasOwn(context, "wordpress"), false);
  assert.equal(Object.isFrozen(context), true);
});

test("Page renderer gives Theme the shared context and compatibility aliases", () => {
  const content = { data: {}, id: "page-1", slug: "welcome", title: "Welcome", type: "page" };
  let received;
  const output = renderPage(
    { canonical: "https://site.example.test/welcome", content, path: "/welcome" },
    (input) => {
      received = input;
      return input.html`<main>${input.context.site.title}: ${input.content.title}</main>`;
    },
    {
      graph: { media: { items: [] }, menus: { items: [{ id: "primary" }] } },
      site: { siteId: "site-a", title: "Site A", url: "https://site.example.test" },
      theme: { name: "storefront" }
    }
  );

  assert.equal(received.context.navigation, received.navigation);
  assert.equal(received.context.content, received.content);
  assert.equal(received.seo.canonical, "https://site.example.test/welcome");
  assert.match(output, /<main>Site A: Welcome<\/main>/);
});
