import assert from "node:assert/strict";
import test from "node:test";
import createSiteCommerceGateway from "../src/runtime/createSiteCommerceGateway.js";

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
