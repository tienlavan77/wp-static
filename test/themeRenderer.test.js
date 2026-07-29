import assert from "node:assert/strict";
import test from "node:test";
import { createContentModel } from "../src/content/createContentPipeline.js";
import createThemeRenderer, { THEME_RENDERER_VERSION } from "../src/renderer/createThemeRenderer.js";

test("Theme Renderer renders Content Model through type layouts without source access", () => {
  const model = createContentModel([{ data: {}, id: "1", slug: "welcome", title: "Welcome", type: "page" }]);
  const renderer = createThemeRenderer({
    defaultLayout: ({ content, html }) => html`<main>${content.title}</main>`,
    layouts: { page: ({ content, html }) => html`<article>${content.title}</article>` }
  });
  const result = renderer.render(model);
  assert.equal(renderer.version, THEME_RENDERER_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.pages[0].path, "/welcome/");
  assert.match(result.pages[0].html, /<article>Welcome<\/article>/);
  assert.equal(result.pages[1].path, "/");
  assert.match(result.pages[1].html, /<article>Welcome<\/article>/);
  assert.equal(Object.isFrozen(result.pages), true);
});

test("Theme Renderer prefers a homepage content item for the root route", () => {
  const model = createContentModel([
    { data: {}, id: "1", slug: "about", title: "About", type: "page" },
    { data: {}, id: "2", slug: "homepage", title: "Home", type: "page" }
  ]);
  const renderer = createThemeRenderer({ defaultLayout: ({ content }) => `<main>${content.title}</main>` });
  const result = renderer.render(model);
  const home = result.pages.find((page) => page.path === "/");
  assert.equal(home.contentId, "2");
});

test("Theme Renderer reports shared diagnostics for invalid models", () => {
  const renderer = createThemeRenderer({ defaultLayout: () => "<main></main>" });
  const result = renderer.render(null);
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.errors[0].code, "theme.renderer.model.invalid");
});
