import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import createContent from "../framework/src/core/createContent.js";
import createRoutes from "../framework/src/builder/router/createRoutes.js";
import renderPage from "../framework/src/builder/renderer/renderPage.js";

test("renderPage keeps dark mode bootstrap without hard-coded site chrome", async () => {
  const content = createContent({
    id: "page-home",
    type: "page",
    title: "Trang chủ",
    slug: "home",
    domain: "shop",
    data: {}
  });
  const route = createRoutes([content], { homepage: "home" })[0];
  const rendered = renderPage(route, ({ html }) => html`<main>ok</main>`);
  const css = await readFile("fixtures/basic-shop/public/style.css", "utf8");

  assert.doesNotMatch(rendered, /class="site-header"/);
  assert.doesNotMatch(rendered, /class="theme-toggle"/);
  assert.doesNotMatch(rendered, /href="\/builder\.html"/);
  assert.match(rendered, /\/storefront\.css\?v=ui-23/);
  assert.match(rendered, /localStorage\.getItem\("wpsc-theme"\)/);
  assert.match(rendered, /document\.documentElement\.dataset\.theme/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /--paper: #101712/);
  assert.match(css, /\.demo-actions/);
  assert.match(css, /background: var\(--surface\)/);
});
