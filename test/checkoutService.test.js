import assert from "node:assert/strict";
import test from "node:test";
import createCheckoutService from "../framework/src/runtime/checkout/createCheckoutService.js";
import createSessionStore from "../framework/src/runtime/commerce/createSessionStore.js";

function session(siteId = "site-a") {
  const value = createSessionStore({ siteId }).create();
  value.cart.push({ key: "44:501", productId: 44, quantity: 2, variationId: 501 });
  return value;
}

const validInput = {
  customer: { address: "So 2 Dong Ho", email: "anh@example.com", name: "Anh Tien", phone: "0900000000" },
  payment: "cod",
  shipment: "local-delivery"
};

test("Checkout validates customer, payment and Cart state", () => {
  const checkout = createCheckoutService({ siteId: "site-a" });
  const state = session();
  const ready = checkout.validate(state, validInput);

  assert.equal(ready.schema, "wpsc.checkout");
  assert.equal(ready.status, "ready");
  assert.equal(ready.siteId, "site-a");
  assert.equal(Object.isFrozen(ready), true);

  const invalid = checkout.validate(state, { customer: {} });
  assert.equal(invalid.status, "invalid");
  assert.deepEqual(invalid.diagnostics.errors.map((item) => item.code), [
    "checkout.customer.email.required",
    "checkout.customer.name.required",
    "checkout.customer.address.required",
    "checkout.payment.required"
  ]);
});

test("Checkout submits authoritative session Cart through provider boundary", async () => {
  const calls = [];
  const checkout = createCheckoutService({
    siteId: "site-a",
    async submitProvider(request) {
      calls.push(request);
      return { orderId: 9001, status: 201 };
    }
  });
  const state = session();
  const submitted = await checkout.submit(state, { ...validInput, items: [{ productId: 999, quantity: 99 }] });

  assert.equal(submitted.checkout.status, "submitted");
  assert.equal(submitted.orderId, 9001);
  assert.deepEqual(calls[0].payload.items, [{ productId: 44, quantity: 2, variationId: 501, variant: { id: 501 } }]);
});

test("Checkout normalizes provider and session failures", async () => {
  const failed = createCheckoutService({
    siteId: "site-a",
    submitProvider: async () => { throw new Error("WooCommerce unavailable"); }
  });
  const result = await failed.submit(session(), validInput);
  assert.equal(result.status, "error");
  assert.equal(result.diagnostics.errors[0].code, "checkout.provider.failed");

  const empty = session();
  empty.cart = [];
  assert.equal((await failed.submit(empty, validInput)).diagnostics.errors[0].code, "checkout.cart.empty");
  assert.throws(() => failed.read(session("site-b")), /Site mismatch/);
});

test("Checkout retains a WooCommerce rejection detail for Browser presentation", async () => {
  const checkout = createCheckoutService({
    siteId: "site-a",
    submitProvider: async () => {
      const error = new Error("WooCommerce request failed: 400 Coupon does not exist.");
      error.code = "ADAPTER_ERROR";
      error.providerCode = "woocommerce_rest_invalid_coupon";
      throw error;
    }
  });

  const result = await checkout.submit(session(), validInput);
  assert.deepEqual(result.diagnostics.errors[0], {
    code: "checkout.provider.rejected",
    detail: "woocommerce_rest_invalid_coupon",
    message: "WooCommerce request failed: 400 Coupon does not exist.",
    severity: "error"
  });
});

test("Checkout can hydrate an empty Runtime Cart from legacy browser selection without trusting prices", async () => {
  const calls = [];
  const checkout = createCheckoutService({
    siteId: "site-a",
    async submitProvider(request) { calls.push(request); return { orderId: 9001, status: 201 }; },
    syncCart(state, items) {
      state.cart = items.map((item) => ({
        key: `${item.productId}:${item.variant?.id ?? 0}`,
        productId: item.productId,
        quantity: item.quantity,
        variationId: item.variant?.id ?? null
      }));
    }
  });
  const state = createSessionStore({ siteId: "site-a" }).create();
  const result = await checkout.submit(state, {
    ...validInput,
    items: [{ price: 1, productId: 44, quantity: 2, variant: { id: 501 } }]
  });

  assert.equal(result.status, 201);
  assert.deepEqual(calls[0].payload.items, [{ productId: 44, quantity: 2, variationId: 501, variant: { id: 501 } }]);
});

test("Checkout does not replace an existing Runtime Cart from Browser input", async () => {
  let synchronized = false;
  const checkout = createCheckoutService({
    siteId: "site-a",
    submitProvider: async () => ({ orderId: 1, status: 201 }),
    syncCart() { synchronized = true; }
  });
  const state = session();
  await checkout.submit(state, { ...validInput, items: [{ productId: 999, quantity: 99 }] });
  assert.equal(synchronized, false);
  assert.equal(state.cart[0].productId, 44);
});
