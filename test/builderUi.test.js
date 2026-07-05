import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builder UI prototype includes palette, canvas, props, preview, and save controls", async () => {
  const html = await readFile(new URL("../packages/builder-ui/app/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../packages/builder-ui/app/builder.js", import.meta.url), "utf8");

  assert.match(html, /data-block-palette/);
  assert.match(html, /data-canvas/);
  assert.match(html, /data-props-panel/);
  assert.match(html, /data-preview/);
  assert.match(html, /data-save-layout/);
  assert.match(script, /commerce\/product-price/);
  assert.match(script, /URL\.createObjectURL/);
});

test("basic shop exposes builder demo in public assets", async () => {
  const html = await readFile(new URL("../examples/basic-shop/public/builder.html", import.meta.url), "utf8");

  assert.match(html, /\/builder-ui\/builder.css/);
  assert.match(html, /\/builder-ui\/builder.js/);
});
