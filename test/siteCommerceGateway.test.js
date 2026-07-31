import assert from "node:assert/strict";
import test from "node:test";
import createSiteCommerceGateway from "../framework/src/runtime/commerce/createSiteCommerceGateway.js";

test("Site Commerce Gateway keeps the auth bridge secret server-side and returns a Runtime session response", async () => {
  const requests = [];
  const gateway = createSiteCommerceGateway({
    credentialStore: { read: async () => ({ woocommerceConsumerKey: "ck_test", woocommerceConsumerSecret: "cs_test" }) },
    environment: { WPSC_AUTH_BRIDGE_SECRET: "bridge-secret" },
    fetchImpl: async (url, init) => {
      requests.push({ init, url });
      return new Response(JSON.stringify({ user: { displayName: "Customer", email: "customer@example.test", id: 42 } }), { status: 200 });
    },
    repository: { readSourceMetadata: async () => ({ endpoint: "https://cms.example.test" }) }
  });

  const result = await gateway.handle("company-a", {
    body: { password: "customer-password", username: "customer@example.test" },
    headers: {},
    method: "POST",
    path: "/api/auth/login"
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, 42);
  assert.match(result.headers["set-cookie"], /wpsc_session=/);
  assert.equal(requests[0].url, "https://cms.example.test/wp-json/wpsc/v1/auth/login");
  assert.equal(requests[0].init.headers["x-wpsc-bridge-secret"], "bridge-secret");
});

test("Site Commerce Gateway sends Checkout to WooCommerce order creation", async () => {
  const requests = [];
  const gateway = createSiteCommerceGateway({
    credentialStore: { read: async () => ({ woocommerceConsumerKey: "ck_test", woocommerceConsumerSecret: "cs_test" }) },
    fetchImpl: async (url, init) => {
      requests.push({ init, url });
      if (String(url).includes("/wp-json/wc/v3/orders")) {
        return new Response(JSON.stringify({
          billing: {},
          currency: "VND",
          id: 9001,
          line_items: [{ id: 1, name: "Hop giay", product_id: 44, quantity: 2, total: "240000", variation_id: 0 }],
          number: "9001",
          payment_method_title: "COD",
          shipping_total: "0",
          status: "pending",
          total: "240000"
        }), { status: 201 });
      }
      return new Response(JSON.stringify({ slug: "hop-giay" }), { status: 200 });
    },
    repository: { readSourceMetadata: async () => ({ endpoint: "https://cms.example.test" }) }
  });

  const added = await gateway.handle("company-a", {
    body: { productId: 44, quantity: 2 },
    headers: {},
    method: "POST",
    path: "/api/cart/items"
  });
  const placed = await gateway.handle("company-a", {
    body: {
      customer: { address: "So 2 Dong Ho", email: "anh@example.com", name: "Anh Tien" },
      payment: "cod"
    },
    headers: { cookie: added.headers["set-cookie"] },
    method: "POST",
    path: "/api/checkout"
  });

  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  assert.equal(placed.body.orderId, 9001);
  assert.equal(placed.body.checkout.status, "submitted");
  const orderRequest = requests.find((request) => String(request.url).includes("/wp-json/wc/v3/orders"));
  assert.ok(orderRequest);
  assert.equal(JSON.parse(orderRequest.init.body).line_items[0].product_id, 44);
});
