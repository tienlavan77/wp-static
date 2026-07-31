import assert from "node:assert/strict";
import test from "node:test";
import { cartStorageKey, readStoredCart } from "../framework/src/runtime/browser/frontend/cart/cartStore.js";

test("stored cart migrates legacy framework product IDs to WooCommerce provider IDs", () => {
  const storage = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value))
  };
  storage.set(cartStorageKey, JSON.stringify([
    { productId: "product-2042", quantity: 2 },
    { productId: "external-product", quantity: 1 }
  ]));

  try {
    const cart = readStoredCart();
    assert.equal(cart[0].productId, "2042");
    assert.equal(cart[1].productId, "external-product");
    assert.equal(JSON.parse(storage.get(cartStorageKey))[0].productId, "2042");
  } finally {
    globalThis.localStorage = previousStorage;
  }
});
