import assert from "node:assert/strict";
import test from "node:test";
import createCustomerIdentity from "../framework/src/runtime/account/createCustomerIdentity.js";
import createSessionStore from "../framework/src/runtime/commerce/createSessionStore.js";
import createSiteCommerceGateway from "../framework/src/runtime/commerce/createSiteCommerceGateway.js";
import createSharedRenderingContext from "../framework/src/theme/createSharedRenderingContext.js";

test("Customer Identity is immutable, provider-backed, and Site-scoped", () => {
  const identity = createCustomerIdentity({
    authenticatedAt: "2026-07-30T10:00:00.000Z",
    siteId: "site-a",
    user: { displayName: "Customer A", email: "a@example.test", id: 42 }
  });

  assert.equal(identity.schema, "wpsc.customer-identity");
  assert.equal(identity.schemaVersion, 1);
  assert.equal(identity.siteId, "site-a");
  assert.equal(identity.customerId, "42");
  assert.equal(identity.provider, "wordpress-woocommerce");
  assert.equal(identity.profileReference.customerId, "42");
  assert.equal(Object.isFrozen(identity), true);
  assert.throws(() => createCustomerIdentity({ siteId: "site-a" }), /Customer id/);
});

test("Customer Session stores reject session ids created for another Site", () => {
  const siteA = createSessionStore({ siteId: "site-a" });
  const siteB = createSessionStore({ siteId: "site-b" });
  const sessionA = siteA.create();

  assert.equal(sessionA.schema, "wpsc.customer-session");
  assert.equal(sessionA.siteId, "site-a");
  assert.equal(siteA.get(sessionA.id), sessionA);
  assert.equal(siteB.get(sessionA.id), null);
  assert.notEqual(siteB.getOrCreate(sessionA.id).id, sessionA.id);
});

test("Site Commerce Gateway does not accept another Site's customer cookie", async () => {
  const gateway = createSiteCommerceGateway({
    credentialStore: {
      read: async () => ({ woocommerceConsumerKey: "ck_test", woocommerceConsumerSecret: "cs_test" })
    },
    fetchImpl: async (url) => {
      if (String(url).endsWith("/wp-json/wpsc/v1/auth/login")) {
        return new Response(JSON.stringify({ user: { displayName: "Customer A", email: "a@example.test", id: 42 } }), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "x-wp-totalpages": "1" } });
    },
    repository: {
      readSourceMetadata: async (siteId) => ({ endpoint: `https://${siteId}.cms.example.test` })
    }
  });
  const login = await gateway.handle("site-a", {
    body: { password: "secret", username: "a@example.test" },
    method: "POST",
    path: "/api/auth/login"
  });
  const cookie = login.headers["set-cookie"];
  const siteBAccount = await gateway.handle("site-b", {
    headers: { cookie },
    method: "GET",
    path: "/api/account/me"
  });

  assert.equal(login.body.identity.siteId, "site-a");
  assert.equal(login.body.identity.customerId, "42");
  assert.deepEqual(siteBAccount.body, { authenticated: false, identity: null, user: null });
  assert.notEqual(siteBAccount.headers["set-cookie"], cookie);
});

test("Theme receives normalized account state without authentication services", () => {
  const identity = createCustomerIdentity({ siteId: "site-a", user: { id: 42 } });
  const account = { addresses: {}, identity, orders: [], user: identity.user };
  const context = createSharedRenderingContext({
    account,
    content: { data: {}, id: "account", slug: "account", title: "Account", type: "account" },
    route: { path: "/account" },
    site: { siteId: "site-a" }
  });

  assert.equal(context.account.identity.siteId, "site-a");
  assert.equal(Object.hasOwn(context, "authService"), false);
  assert.equal(Object.hasOwn(context, "credentials"), false);
});
