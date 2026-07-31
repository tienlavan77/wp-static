import assert from "node:assert/strict";
import test from "node:test";
import createContent from "../framework/src/core/createContent.js";
import createRoutes from "../framework/src/builder/router/createRoutes.js";
import createSeoMetadata from "../framework/src/builder/seo/createSeoMetadata.js";
import renderSeoTags from "../framework/src/builder/seo/renderSeoTags.js";
import generateSitemap from "../framework/src/builder/seo/generateSitemap.js";
import generateRobotsTxt from "../framework/src/builder/seo/generateRobotsTxt.js";

test("createSeoMetadata uses content.seo with site fallback", () => {
  const content = createContent({
    id: "page-1",
    type: "page",
    title: "Page Title",
    slug: "page-title",
    domain: "test",
    data: {},
    seo: {
      title: "SEO Title",
      description: "SEO Description",
      robots: ["noindex", "nofollow"],
      openGraph: {
        image: "https://example.com/og.jpg"
      }
    }
  });
  const route = createRoutes([content])[0];
  const metadata = createSeoMetadata(content, route, {
    site: {
      url: "https://example.com",
      description: "Fallback"
    }
  });

  assert.equal(metadata.title, "SEO Title");
  assert.equal(metadata.description, "SEO Description");
  assert.equal(metadata.canonical, "https://example.com/page-title");
  assert.deepEqual(metadata.robots, ["noindex", "nofollow"]);
  assert.equal(metadata.twitter.card, "summary_large_image");
});

test("renderSeoTags renders meta, canonical, Open Graph, and Twitter tags", () => {
  const content = createContent({
    id: "page-1",
    type: "page",
    title: "Page Title",
    slug: "page-title",
    domain: "test",
    data: {
      description: "Description"
    }
  });
  const route = createRoutes([content])[0];
  const tags = renderSeoTags(content, route, {
    site: {
      url: "https://example.com"
    }
  });

  assert.match(tags, /<title>Page Title<\/title>/);
  assert.match(tags, /<meta name="description" content="Description">/);
  assert.match(tags, /<link rel="canonical" href="https:\/\/example.com\/page-title">/);
  assert.match(tags, /<meta property="og:title" content="Page Title">/);
  assert.match(tags, /<meta name="twitter:card" content="summary">/);
});

test("createSeoMetadata strips source HTML from static meta descriptions", () => {
  const content = createContent({
    data: { description: "<p>In <strong>nhanh</strong> tai Ho Chi Minh.</p>" },
    domain: "wordpress",
    id: "page-2",
    slug: "in-nhanh",
    title: "In nhanh",
    type: "page"
  });
  const route = createRoutes([content])[0];
  const metadata = createSeoMetadata(content, route, { site: { url: "https://example.com" } });

  assert.equal(metadata.description, "In nhanh tai Ho Chi Minh.");
});

test("createSeoMetadata prefers excerpt and emits Article JSON-LD for posts", () => {
  const content = createContent({
    data: {
      description: "Full body should not be used when excerpt exists.",
      excerpt: "<p>Short <strong>editorial</strong> excerpt&nbsp;for readers.</p>",
      date: "2026-07-31T09:00:00Z",
      modified: "2026-07-31T10:00:00Z",
      author: { name: "La Van Tien", url: "https://example.com/author/tien" }
    },
    domain: "wordpress",
    id: "post-5",
    slug: "hello-world",
    title: "Hello World",
    type: "post"
  });
  const route = createRoutes([content])[0];
  const metadata = createSeoMetadata(content, route, { site: { url: "https://example.com" } });

  assert.equal(metadata.description, "Short editorial excerpt for readers.");
  assert.equal(metadata.structuredData[0]["@type"], "Article");
  assert.equal(metadata.structuredData[0].datePublished, "2026-07-31T09:00:00Z");
  assert.equal(metadata.structuredData[0].author.name, "La Van Tien");
  assert.match(renderSeoTags(content, route, { site: { url: "https://example.com" } }), /application\/ld\+json/);
});

test("404 and search routes are noindex and absent from sitemap", () => {
  const notFound = createContent({ data: { notFoundPage: true }, domain: "runtime", id: "runtime:not-found", slug: "404", title: "Not found", type: "page" });
  const search = createContent({ data: {}, domain: "runtime", id: "runtime:search", slug: "search", title: "Search", type: "search" });
  const routes = createRoutes([notFound, search]);
  const sitemap = generateSitemap({ pages: routes.map((route) => ({ route })) }, { site: { url: "https://example.com" } });

  assert.deepEqual(createSeoMetadata(notFound, routes[0], { site: { url: "https://example.com" } }).robots, ["noindex", "follow"]);
  assert.doesNotMatch(sitemap, /404|search/);
});

test("category, tag, and product-category archives emit CollectionPage JSON-LD", () => {
  for (const taxonomy of ["category", "post_tag", "product_cat"]) {
    const content = {
      id: `archive:${taxonomy}:mau:page:1`,
      type: `archive:${taxonomy}`,
      title: `Archive: Mau (${taxonomy})`,
      data: {
        archive: {
          taxonomy,
          term: { name: "Mau" },
          items: [{ id: "item-1" }, { id: "item-2" }]
        }
      }
    };
    const route = { path: `/mau-${taxonomy}`, canonical: `https://example.com/mau-${taxonomy}` };
    const metadata = createSeoMetadata(content, route, { site: { url: "https://example.com" } });

    assert.equal(metadata.structuredData[0]["@type"], "CollectionPage");
    assert.equal(metadata.structuredData[0].about.inDefinedTermSet, taxonomy === "product_cat" ? "Product category" : taxonomy === "post_tag" ? "Tag" : "Category");
    assert.equal(metadata.structuredData[1]["@type"], "BreadcrumbList");
  }
});

test("generateSitemap and generateRobotsTxt use site URL", () => {
  const content = createContent({
    id: "page-home",
    type: "page",
    title: "Home",
    slug: "home",
    domain: "test",
    data: {}
  });
  const routes = createRoutes([content], { homepage: "home" });
  const sitePlan = {
    pages: routes.map((route) => ({ route }))
  };
  const sitemap = generateSitemap(sitePlan, {
    site: { url: "https://example.com" }
  });
  const robots = generateRobotsTxt({
    site: { url: "https://example.com" }
  });

  assert.match(sitemap, /<loc>https:\/\/example.com\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/example.com\/sitemap.xml/);
});

test("transactional Runtime routes are noindex and excluded from the sitemap", () => {
  const checkout = createContent({ data: {}, domain: "runtime", id: "runtime:checkout", slug: "checkout", title: "Checkout", type: "page" });
  const product = createContent({ data: {}, domain: "woocommerce", id: "product-1", slug: "card", title: "Card", type: "product" });
  const routes = createRoutes([checkout, product]);
  const checkoutRoute = routes.find((route) => route.path === "/checkout");
  const sitemap = generateSitemap({ pages: routes.map((route) => ({ route })) }, { site: { url: "https://example.com" } });

  assert.deepEqual(createSeoMetadata(checkout, checkoutRoute, { site: { url: "https://example.com" } }).robots, ["noindex", "follow"]);
  assert.doesNotMatch(sitemap, /https:\/\/example.com\/checkout/);
  assert.match(sitemap, /https:\/\/example.com\/card/);
});
