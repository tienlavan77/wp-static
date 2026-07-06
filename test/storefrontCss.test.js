import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("basic shop exposes Tailwind storefront CSS foundation", async () => {
  const source = await readFile("examples/basic-shop/theme/storefront.css", "utf8");
  const output = await readFile("examples/basic-shop/public/storefront.css", "utf8");

  assert.match(source, /@import "tailwindcss"/);
  assert.match(source, /--color-brand-600/);
  assert.match(source, /\.storefront-container/);
  assert.match(source, /font-size: 13pt/);
  assert.match(source, /max-width: 1340px/);
  assert.match(source, /\.site-shell/);
  assert.match(source, /max-width: none/);
  assert.match(output, /\.storefront-container/);
  assert.match(output, /font-size:13pt/);
  assert.match(output, /max-width:1340px/);
  assert.match(output, /\.site-shell\{width:100%;max-width:none;margin:0\}/);
  assert.match(output, /--storefront-brand/);
});
