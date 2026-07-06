import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import createContent from "../src/core/createContent.js";
import createRoutes from "../src/router/createRoutes.js";
import renderPage from "../src/renderer/renderPage.js";

test("renderPage includes a working dark mode toggle in the site header", async () => {
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
  const css = await readFile("examples/basic-shop/public/style.css", "utf8");

  assert.match(rendered, /class="theme-toggle"/);
  assert.match(rendered, /href="\/builder\.html"/);
  assert.match(rendered, /\/style\.css\?v=darkmode-1/);
  assert.match(rendered, /\/storefront\.css\?v=ui-1/);
  assert.match(rendered, /localStorage\.getItem\("wpsc-theme"\)/);
  assert.match(rendered, /document\.documentElement\.dataset\.theme/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /--paper: #101712/);
  assert.match(css, /\.demo-actions/);
  assert.match(css, /background: var\(--surface\)/);
});
