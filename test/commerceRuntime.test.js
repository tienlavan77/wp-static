import assert from "node:assert/strict";
import test from "node:test";
import createCommerceRuntime from "../framework/src/runtime/commerce/createCommerceRuntime.js";
import createWooCommerceAccountService from "../framework/src/runtime/commerce/createWooCommerceAccountService.js";
import createWordPressAuthService from "../framework/src/runtime/commerce/createWordPressAuthService.js";

test("commerce runtime serves health and creates customer session cookie", async () => {
  const runtime = createCommerceRuntime();
  const response = await runtime.handle(new Request("http://runtime.local/health"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.match(response.headers.get("set-cookie"), /wpsc_session=/);
});

test("commerce runtime supports cart add, merge, read, and delete", async () => {
  const runtime = createCommerceRuntime({
    resolveCartItems: async ({ items }) => items.map((item) => ({
      ...item,
      currency: "VND",
      inStock: true,
      price: 50000
    }))
  });
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
    available: null,
    inStock: null,
    key: "44:0",
    pricing: { currency: null, lineTotal: null, unitPrice: null },
    product: { id: "44" },
    quantity: 3,
    variation: null
  }]);

  const refreshed = await runtime.handle(new Request("http://runtime.local/cart/refresh", {
    headers: { cookie },
    method: "POST"
  }));
  const refreshedCart = await refreshed.json();
  assert.equal(refreshedCart.items[0].pricing.unitPrice, 50000);
  assert.equal(refreshedCart.items[0].pricing.lineTotal, 150000);
  assert.equal(refreshedCart.items[0].inStock, true);

  const updated = await runtime.handle(new Request("http://runtime.local/cart/items/44:0", {
    body: JSON.stringify({ quantity: 2 }),
    headers: { cookie },
    method: "PATCH"
  }));
  assert.equal((await updated.json()).items[0].quantity, 2);

  const removed = await runtime.handle(new Request("http://runtime.local/cart/items/44", {
    headers: {
      cookie
    },
    method: "DELETE"
  }));

  const removedCart = await removed.json();
  assert.equal(removedCart.schema, "wpsc.cart");
  assert.deepEqual(removedCart.items, []);
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
      customer: {
        address: "So 2 Dong Ho",
        email: "anh@example.com",
        name: "Anh Tien"
      },
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
  const checkoutPayload = await checkout.json();
  assert.equal(checkoutPayload.orderId, 1001);
  assert.equal(checkoutPayload.status, 201);
  assert.equal(checkoutPayload.checkout.schema, "wpsc.checkout");
  assert.equal(checkoutPayload.checkout.status, "submitted");
  assert.deepEqual(await order.json(), {
    id: "1001",
    status: "processing"
  });
  assert.deepEqual(calls, [
    ["checkout", 1],
    ["order", "1001"]
  ]);
});

test("commerce runtime hydrates an empty Cart from a legacy checkout selection", async () => {
  const calls = [];
  const runtime = createCommerceRuntime({
    checkoutProxy(request) {
      calls.push(request);
      return { orderId: 1002, status: 201 };
    }
  });
  const checkout = await runtime.handle(new Request("http://runtime.local/checkout", {
    body: JSON.stringify({
      customer: { address: "So 2 Dong Ho", email: "anh@example.com", name: "Anh Tien" },
      items: [{ price: 1, productId: 44, quantity: 2, variant: { id: 501 } }],
      payment: "cod"
    }),
    method: "POST"
  }));

  assert.equal(checkout.status, 201);
  assert.deepEqual(calls[0].payload.items, [{ productId: 44, quantity: 2, variationId: 501, variant: { id: 501 } }]);
});

test("commerce runtime exposes an invalid provider product ID as a checkout diagnostic", async () => {
  const runtime = createCommerceRuntime({
    checkoutProxy() {
      const error = new Error("Cart contains no valid WooCommerce product.");
      error.code = "checkout.cart.product.invalid";
      throw error;
    }
  });
  const added = await runtime.handle(new Request("http://runtime.local/cart/items", {
    body: JSON.stringify({ productId: "product-44", quantity: 1 }),
    method: "POST"
  }));
  const checkout = await runtime.handle(new Request("http://runtime.local/checkout", {
    body: JSON.stringify({
      customer: { address: "So 2 Dong Ho", email: "anh@example.com", name: "Anh Tien" },
      payment: "cod"
    }),
    headers: { cookie: added.headers.get("set-cookie") },
    method: "POST"
  }));

  assert.equal(checkout.status, 400);
  assert.equal((await checkout.json()).diagnostics.errors[0].code, "checkout.cart.product.invalid");
});

test("commerce runtime authenticates account through server-side handlers", async () => {
  const calls = [];
  const runtime = createCommerceRuntime({
    accountLookup({ session, userId }) {
      calls.push(["account", userId, session.user.id]);

      return {
        addresses: {
          shipping: {
            address1: "So 2 Dong Ho",
            city: "TP.HCM"
          }
        },
        orders: [{
          id: 99,
          status: "processing",
          total: 120000
        }],
        user: {
          displayName: "Anh Tien",
          id: userId
        }
      };
    },
    authLogin({ credentials }) {
      calls.push(["login", credentials.username]);

      return {
        user: {
          displayName: "Anh Tien",
          email: "anh@example.com",
          id: 123
        }
      };
    },
    authLogout({ session }) {
      calls.push(["logout", session.user.id]);
    }
  });
  const unauthenticated = await runtime.handle(new Request("http://runtime.local/api/account/me"));
  const login = await runtime.handle(new Request("http://runtime.local/api/auth/login", {
    body: JSON.stringify({
      password: "secret",
      username: "anh@example.com"
    }),
    method: "POST"
  }));
  const cookie = login.headers.get("set-cookie");
  const account = await runtime.handle(new Request("http://runtime.local/api/account/me", {
    headers: {
      cookie
    }
  }));
  const logout = await runtime.handle(new Request("http://runtime.local/api/auth/logout", {
    headers: {
      cookie
    },
    method: "POST"
  }));
  const afterLogout = await runtime.handle(new Request("http://runtime.local/api/account/me", {
    headers: {
      cookie
    }
  }));

  assert.equal(unauthenticated.status, 200);
  assert.deepEqual(await unauthenticated.json(), {
    authenticated: false,
    identity: null,
    user: null
  });
  assert.equal(login.status, 200);
  assert.match(cookie, /wpsc_session=/);
  const accountPayload = await account.json();
  assert.equal(accountPayload.identity.schema, "wpsc.customer-identity");
  assert.equal(accountPayload.identity.siteId, "default");
  assert.equal(accountPayload.identity.customerId, "123");
  assert.deepEqual({ ...accountPayload, identity: undefined }, {
    addresses: {
      shipping: {
        address1: "So 2 Dong Ho",
        city: "TP.HCM"
      }
    },
    identity: undefined,
    orders: [{
      id: 99,
      status: "processing",
      total: 120000
    }],
    user: {
      displayName: "Anh Tien",
      email: "anh@example.com",
      emailVerified: false,
      id: 123,
      roles: []
    }
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(afterLogout.status, 200);
  assert.deepEqual(await afterLogout.json(), {
    authenticated: false,
    identity: null,
    user: null
  });
  assert.deepEqual(calls, [
    ["login", "anh@example.com"],
    ["account", 123, 123],
    ["logout", 123]
  ]);
});

test("commerce runtime protects account order and update endpoints with session user", async () => {
  const calls = [];
  const runtime = createCommerceRuntime({
    accountAddressUpdate({ payload, userId }) {
      calls.push(["address", userId, payload.shipping.city]);
      return { addresses: payload };
    },
    accountOrderLookup({ orderId, userId }) {
      calls.push(["order", userId, orderId]);
      return { id: orderId, total: 1000 };
    },
    accountPasswordReset({ payload }) {
      calls.push(["password", payload.username]);
      return { ok: true };
    },
    accountProfileUpdate({ payload, userId }) {
      calls.push(["profile", userId, payload.email]);
      return { user: { email: payload.email, id: userId } };
    },
    authLogin() {
      return { user: { email: "a@example.com", id: 123 } };
    }
  });
  const login = await runtime.handle(new Request("http://runtime.local/api/auth/login", {
    body: JSON.stringify({ password: "x", username: "a@example.com" }),
    method: "POST"
  }));
  const cookie = login.headers.get("set-cookie");
  const order = await runtime.handle(new Request("http://runtime.local/api/account/orders/501", { headers: { cookie } }));
  const address = await runtime.handle(new Request("http://runtime.local/api/account/addresses", {
    body: JSON.stringify({ shipping: { city: "TP.HCM" } }),
    headers: { cookie },
    method: "POST"
  }));
  const profile = await runtime.handle(new Request("http://runtime.local/api/account/profile", {
    body: JSON.stringify({ email: "new@example.com" }),
    headers: { cookie },
    method: "POST"
  }));
  const password = await runtime.handle(new Request("http://runtime.local/api/account/password-reset", {
    body: JSON.stringify({ username: "a@example.com" }),
    method: "POST"
  }));

  assert.deepEqual(await order.json(), { id: "501", total: 1000 });
  assert.equal(address.status, 200);
  assert.equal(profile.status, 200);
  assert.equal(password.status, 200);
  assert.deepEqual(calls, [
    ["order", 123, "501"],
    ["address", 123, "TP.HCM"],
    ["profile", 123, "new@example.com"],
    ["password", "a@example.com"]
  ]);
});

test("commerce runtime converts account order handler failures to 404", async () => {
  const runtime = createCommerceRuntime({
    accountOrderLookup() {
      throw new Error("WooCommerce failed.");
    },
    authLogin() {
      return {
        user: {
          id: 123
        }
      };
    }
  });
  const login = await runtime.handle(new Request("http://runtime.local/api/auth/login", {
    body: JSON.stringify({ password: "x", username: "a@example.com" }),
    method: "POST"
  }));
  const response = await runtime.handle(new Request("http://runtime.local/api/account/orders/3782", {
    headers: {
      cookie: login.headers.get("set-cookie")
    }
  }));

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "Order not found.",
    status: 404
  });
});

test("commerce runtime does not treat Woo order status as HTTP status", async () => {
  const runtime = createCommerceRuntime({
    accountOrderLookup() {
      return {
        id: 3782,
        status: "completed",
        total: 1632000
      };
    },
    authLogin() {
      return {
        user: {
          id: 27
        }
      };
    }
  });
  const login = await runtime.handle(new Request("http://runtime.local/api/auth/login", {
    body: JSON.stringify({ password: "x", username: "a@example.com" }),
    method: "POST"
  }));
  const response = await runtime.handle(new Request("http://runtime.local/api/account/orders/3782", {
    headers: {
      cookie: login.headers.get("set-cookie")
    }
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: 3782,
    status: "completed",
    total: 1632000
  });
});

test("WooCommerce account service fetches customer data by session user id", async () => {
  const calls = [];
  const service = createWooCommerceAccountService({
    client: {
      getCollection(pathname, query) {
        calls.push(["collection", pathname, query]);

        return [{
          currency: "VND",
          date_created: "2026-07-18T08:00:00",
          id: 501,
          number: "TSP-501",
          status: "processing",
          total: "350000"
        }];
      },
      getResource(pathname) {
        calls.push(["resource", pathname]);

        return {
          billing: {
            address_1: "So 2 Dong Ho",
            city: "TP.HCM",
            phone: "0900000000"
          },
          email: "customer@example.com",
          first_name: "Anh",
          id: 123,
          last_name: "Tien",
          shipping: {
            address_1: "So 2 Dong Ho",
            city: "TP.HCM"
          },
          username: "anhtien"
        };
      }
    },
    maxOrders: 5
  });

  const account = await service.accountLookup({ userId: 123 });

  assert.deepEqual(calls, [
    ["resource", "/wp-json/wc/v3/customers/123"],
    ["collection", "/wp-json/wc/v3/orders", {
      customer: 123,
      order: "desc",
      orderby: "date",
      per_page: 5
    }]
  ]);
  assert.deepEqual(account.user, {
    displayName: "Anh Tien",
    email: "customer@example.com",
    firstName: "Anh",
    id: 123,
    lastName: "Tien",
    username: "anhtien"
  });
  assert.deepEqual(account.addresses.shipping, {
    address1: "So 2 Dong Ho",
    address2: "",
    city: "TP.HCM",
    company: "",
    country: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    postcode: "",
    state: ""
  });
  assert.deepEqual(account.orders, [{
    currency: "VND",
    dateCreated: "2026-07-18T08:00:00",
    id: 501,
    number: "TSP-501",
    status: "processing",
    statusLabel: "Đang xử lý",
    total: 350000
  }]);
});

test("WooCommerce account service returns 404 when order lookup fails", async () => {
  const service = createWooCommerceAccountService({
    client: {
      getCollection() {
        return [];
      },
      getResource() {
        throw new Error("Woo order not found.");
      }
    }
  });

  assert.deepEqual(await service.accountOrderLookup({ orderId: 3782, userId: 123 }), {
    error: "Order not found.",
    status: 404
  });
});

test("WooCommerce account service creates checkout order", async () => {
  const calls = [];
  const service = createWooCommerceAccountService({
    client: {
      async createResource(pathname, payload) {
        calls.push(["create", pathname, payload]);

        return {
          billing: payload.billing,
          currency: "VND",
          id: 9001,
          line_items: [{
            id: 1,
            name: "Danh thiếp",
            product_id: 44,
            quantity: 2,
            total: "200000",
            variation_id: 55
          }],
          number: "9001",
          payment_method_title: payload.payment_method_title,
          shipping_total: "30000",
          status: "pending",
          total: "230000"
        };
      },
      async getResource(pathname) {
        calls.push(["resource", pathname]);
        return {
          slug: "danh-thiep"
        };
      }
    }
  });

  const order = await service.checkoutProxy({
    payload: {
      customer: {
        address: "So 2 Dong Ho, TP.HCM",
        email: "anh@example.com",
        name: "Anh Tien",
        phone: "0900000000"
      },
      items: [{
        productId: 44,
        quantity: 2,
        variant: {
          id: 55
        }
      }],
      coupon: "SALE10",
      payment: "bank-transfer",
      paymentLabel: "Chuyển khoản ngân hàng",
      shipment: "local-delivery",
      shipmentLabel: "Giao hàng nội thành - 30.000đ",
      shippingFee: 30000
    },
    session: {
      user: {
        id: 123
      }
    }
  });

  assert.equal(order.orderId, 9001);
  assert.equal(order.items[0].permalink, "/danh-thiep");
  assert.equal(calls[0][0], "create");
  assert.equal(calls[0][1], "/wp-json/wc/v3/orders");
  assert.equal(calls[0][2].customer_id, 123);
  assert.deepEqual(calls[0][2].coupon_lines, [{ code: "SALE10" }]);
  assert.equal(calls[0][2].payment_method_title, "Chuyển khoản ngân hàng");
  assert.equal(calls[0][2].shipping_lines[0].method_title, "Giao hàng nội thành - 30.000đ");
  assert.deepEqual(calls[0][2].meta_data.filter((item) => item.key.startsWith("_wpsc_")), [
    { key: "_wpsc_source", value: "wp-static" },
    { key: "_wpsc_note", value: "" },
    { key: "_wpsc_coupon", value: "SALE10" },
    { key: "_wpsc_payment_label", value: "Chuyển khoản ngân hàng" },
    { key: "_wpsc_shipment_label", value: "Giao hàng nội thành - 30.000đ" }
  ]);
  assert.deepEqual(calls[0][2].line_items, [{
    product_id: 44,
    quantity: 2,
    variation_id: 55
  }]);
});

test("WooCommerce account service rejects framework Content IDs before creating an empty order", async () => {
  let called = false;
  const service = createWooCommerceAccountService({
    client: {
      async createResource() {
        called = true;
        return {};
      }
    }
  });

  await assert.rejects(
    () => service.checkoutProxy({
      payload: {
        customer: { address: "So 2 Dong Ho", email: "anh@example.com", name: "Anh Tien" },
        items: [{ productId: "product-44", quantity: 1 }],
        payment: "cod"
      },
      session: {}
    }),
    (error) => error.code === "checkout.cart.product.invalid"
  );
  assert.equal(called, false);
});

test("WooCommerce account service protects public order lookup by contact", async () => {
  const service = createWooCommerceAccountService({
    client: {
      async getResource(pathname) {
        if (pathname.includes("/products/")) {
          return {
            slug: "danh-thiep"
          };
        }

        return {
          billing: {
            email: "anh@example.com",
            phone: "0900000000"
          },
          currency: "VND",
          id: 9001,
          line_items: [],
          number: "9001",
          status: "processing",
          total: "230000"
        };
      }
    }
  });

  const found = await service.orderLookup({
    contact: "0900000000",
    orderId: 9001
  });
  const hidden = await service.orderLookup({
    contact: "other@example.com",
    orderId: 9001
  });

  assert.equal(found.id, 9001);
  assert.deepEqual(hidden, {
    error: "Order not found.",
    status: 404
  });
});

test("WordPress auth service delegates login to configured auth endpoint", async () => {
  const requests = [];
  const service = createWordPressAuthService({
    baseUrl: "https://api.example.com",
    bridgeSecret: "bridge-secret",
    fetchImpl: async (url, init) => {
      requests.push({
        body: JSON.parse(init.body),
        headers: init.headers,
        method: init.method,
        url: String(url)
      });

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            user: {
              display_name: "Anh Tien",
              email: "anh@example.com",
              id: 123,
              roles: ["customer"]
            }
          };
        }
      };
    }
  });

  const result = await service.authLogin({
    credentials: {
      password: "secret",
      username: "anh@example.com"
    }
  });

  assert.deepEqual(requests, [{
    body: {
      password: "secret",
      username: "anh@example.com"
    },
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-wpsc-bridge-secret": "bridge-secret"
    },
    method: "POST",
    url: "https://api.example.com/wp-json/wpsc/v1/auth/login"
  }]);
  assert.deepEqual(result, {
    user: {
      displayName: "Anh Tien",
      email: "anh@example.com",
      emailVerified: false,
      id: 123,
      roles: ["customer"]
    }
  });
});

test("WordPress auth service returns failed login status", async () => {
  const service = createWordPressAuthService({
    baseUrl: "https://api.example.com",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      async json() {
        return {
          message: "Invalid credentials."
        };
      }
    })
  });

  const result = await service.authLogin({
    credentials: {
      password: "wrong",
      username: "anh@example.com"
    }
  });

  assert.deepEqual(result, {
    error: "Invalid credentials.",
    status: 401
  });
});
