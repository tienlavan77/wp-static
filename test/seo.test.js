import assert from "node:assert/strict";
import test from "node:test";
import createContent from "../src/core/createContent.js";
import createRoutes from "../src/router/createRoutes.js";
import createSeoMetadata from "../src/seo/createSeoMetadata.js";
import renderSeoTags from "../src/seo/renderSeoTags.js";
import generateSitemap from "../src/seo/generateSitemap.js";
import generateRobotsTxt from "../src/seo/generateRobotsTxt.js";

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
