import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("basic shop exposes Tailwind storefront CSS foundation", async () => {
  const source = await readFile("examples/basic-shop/theme/storefront.css", "utf8");
  const output = await readFile("examples/basic-shop/public/storefront.css", "utf8");

  assert.match(source, /@import "tailwindcss"/);
  assert.match(source, /--color-brand-600/);
  assert.match(source, /\.storefront-container/);
  assert.match(output, /\.storefront-container/);
  assert.match(output, /--storefront-brand/);
});
