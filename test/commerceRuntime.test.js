import assert from "node:assert/strict";
import test from "node:test";
import createCommerceRuntime from "../src/runtime/commerce/createCommerceRuntime.js";

test("commerce runtime serves health and creates customer session cookie", async () => {
  const runtime = createCommerceRuntime();
  const response = await runtime.handle(new Request("http://runtime.local/health"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.match(response.headers.get("set-cookie"), /wpsc_session=/);
});

test("commerce runtime supports cart add, merge, read, and delete", async () => {
  const runtime = createCommerceRuntime();
  const first = await runtime.handle(new Request("http://runtime.local/cart/items", {
    body: JSON.stringify({
      productId: 44,
      quantity: 2
    }),
    method: "POST"
  }));
  const cookie = first.headers.get("set-cookie");
  const second = await runtime.handle(new Request("http://runtime.local/cart/items", {
    body: JSON.stringify({
      productId: 44,
      quantity: 1
    }),
    headers: {
      cookie
    },
    method: "POST"
  }));
  const cart = await second.json();

  assert.deepEqual(cart.items, [{
    productId: 44,
    quantity: 3
  }]);

  const removed = await runtime.handle(new Request("http://runtime.local/cart/items/44", {
    headers: {
      cookie
    },
    method: "DELETE"
  }));

  assert.deepEqual(await removed.json(), { items: [] });
});

test("commerce runtime delegates checkout and order lookup to server-side handlers", async () => {
  const calls = [];
  const runtime = createCommerceRuntime({
    checkoutProxy(payload) {
      calls.push(["checkout", payload.cart.length]);

      return {
        orderId: 1001,
        status: 201
      };
    },
    orderLookup(payload) {
      calls.push(["order", payload.orderId]);

      return {
        id: payload.orderId,
        status: "processing"
      };
    }
  });
  const add = await runtime.handle(new Request("http://runtime.local/cart/items", {
    body: JSON.stringify({
      productId: "sku-1"
    }),
    method: "POST"
  }));
  const cookie = add.headers.get("set-cookie");
  const checkout = await runtime.handle(new Request("http://runtime.local/checkout", {
    body: JSON.stringify({
      paymentMethod: "cod"
    }),
    headers: {
      cookie
    },
    method: "POST"
  }));
  const order = await runtime.handle(new Request("http://runtime.local/orders/1001", {
    headers: {
      cookie
    }
  }));

  assert.equal(checkout.status, 201);
  assert.deepEqual(await checkout.json(), {
    orderId: 1001,
    status: 201
  });
  assert.deepEqual(await order.json(), {
    id: "1001",
    status: "processing"
  });
  assert.deepEqual(calls, [
    ["checkout", 1],
    ["order", "1001"]
  ]);
});
