import assert from "node:assert/strict";
import test from "node:test";
import createCartService from "../framework/src/runtime/cart/createCartService.js";
import createSessionStore from "../framework/src/runtime/commerce/createSessionStore.js";

function session(siteId = "site-a") {
  return createSessionStore({ siteId }).create();
}

test("Cart Service supports product and variation lifecycle with immutable contracts", () => {
  const cart = createCartService({ siteId: "site-a" });
  const state = session();
  cart.add(state, { productId: 44, quantity: 2, variationId: 501 });
  const added = cart.add(state, { productId: 44, quantity: 1, variationId: 501 });
  cart.add(state, { productId: 44, quantity: 1, variationId: 502 });

  assert.equal(added.schema, "wpsc.cart");
  assert.equal(added.siteId, "site-a");
  assert.equal(added.items[0].key, "44:501");
  assert.equal(added.items[0].quantity, 3);
  assert.equal(cart.read(state).items.length, 2);

  const updated = cart.update(state, "44:501", { quantity: 4 });
  assert.equal(updated.items.find((item) => item.key === "44:501").quantity, 4);
  assert.equal(cart.update(state, "44:501", { quantity: 0 }).items.length, 1);
  assert.equal(cart.remove(state, "44:502").items.length, 0);
  assert.equal(Object.isFrozen(added), true);
});

test("Cart refresh accepts authoritative provider price and stock state", async () => {
  const cart = createCartService({
    resolveItems: async ({ items, siteId }) => items.map((item) => ({
      ...item,
      currency: "VND",
      inStock: true,
      price: 120000,
      resolvedFor: siteId
    })),
    siteId: "site-a"
  });
  const state = session();
  cart.add(state, { productId: 44, quantity: 2 });
  const refreshed = await cart.refresh(state);

  assert.equal(refreshed.items[0].pricing.unitPrice, 120000);
  assert.equal(refreshed.items[0].pricing.lineTotal, 240000);
  assert.equal(refreshed.items[0].inStock, true);
  assert.deepEqual(refreshed.totals, { currency: "VND", subtotal: 240000, total: 240000 });
});

test("Cart refresh marks provider-missing products unavailable", async () => {
  const cart = createCartService({ resolveItems: async () => [], siteId: "site-a" });
  const state = session();
  cart.add(state, { productId: 44 });
  const refreshed = await cart.refresh(state);

  assert.equal(refreshed.items[0].available, false);
  assert.equal(refreshed.items[0].inStock, false);
  assert.equal(refreshed.items[0].pricing.unitPrice, null);
});

test("Cart Service rejects another Site's session", () => {
  const cart = createCartService({ siteId: "site-a" });
  assert.throws(() => cart.read(session("site-b")), /Site mismatch/);
});

test("Cart clear and invalid quantity behavior are deterministic", () => {
  const cart = createCartService({ siteId: "site-a" });
  const state = session();
  cart.add(state, { productId: 44 });

  assert.equal(cart.update(state, "44:0", { quantity: -1 }).ok, false);
  const cleared = cart.clear(state);
  assert.equal(cleared.itemCount, 0);
  assert.deepEqual(cleared.items, []);
});
