import createSessionStore from "./createSessionStore.js";
import resolveCustomerSession from "./sessionMiddleware.js";

export default function createCommerceRuntime(options = {}) {
  const sessionStore = options.sessionStore ?? createSessionStore();
  const checkoutProxy = options.checkoutProxy ?? defaultCheckoutProxy;
  const orderLookup = options.orderLookup ?? defaultOrderLookup;

  return {
    async handle(request) {
      return handleCommerceRequest(request, {
        checkoutProxy,
        orderLookup,
        sessionStore
      });
    },
    sessionStore
  };
}

async function handleCommerceRequest(request, context) {
  const url = new URL(request.url);
  const { cookieHeader, session } = resolveCustomerSession(request, context.sessionStore);
  const headers = {
    "content-type": "application/json; charset=utf-8"
  };

  if (cookieHeader) {
    headers["set-cookie"] = cookieHeader;
  }

  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true }, { headers });
  }

  if (url.pathname === "/cart" && request.method === "GET") {
    return json({ items: session.cart }, { headers });
  }

  if (url.pathname === "/cart/items" && request.method === "POST") {
    const item = await readJson(request);
    const cartItem = normalizeCartItem(item);
    const existing = session.cart.find((entry) => entry.productId === cartItem.productId);

    if (existing) {
      existing.quantity += cartItem.quantity;
    } else {
      session.cart.push(cartItem);
    }

    return json({ items: session.cart }, { headers, status: 201 });
  }

  if (url.pathname.startsWith("/cart/items/") && request.method === "DELETE") {
    const productId = decodeURIComponent(url.pathname.replace("/cart/items/", ""));
    session.cart = session.cart.filter((item) => String(item.productId) !== productId);

    return json({ items: session.cart }, { headers });
  }

  if (url.pathname === "/checkout" && request.method === "POST") {
    const payload = await readJson(request);
    const checkout = await context.checkoutProxy({
      cart: session.cart,
      payload,
      session
    });

    return json(checkout, { headers, status: checkout.status ?? 200 });
  }

  if (url.pathname.startsWith("/orders/") && request.method === "GET") {
    const orderId = decodeURIComponent(url.pathname.replace("/orders/", ""));
    const order = await context.orderLookup({
      orderId,
      session
    });

    return json(order, { headers });
  }

  return json({ error: "Not found" }, { headers, status: 404 });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeCartItem(item) {
  const productId = item.productId ?? item.id;
  const quantity = Number(item.quantity ?? 1);

  if (!productId) {
    throw new Error('Cart item field "productId" is required.');
  }

  return {
    productId,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  };
}

function defaultCheckoutProxy() {
  return {
    error: "Checkout proxy is not configured.",
    status: 501
  };
}

function defaultOrderLookup() {
  return {
    error: "Order lookup is not configured.",
    status: 501
  };
}

function json(payload, options = {}) {
  return new Response(JSON.stringify(payload), {
    headers: options.headers,
    status: options.status ?? 200
  });
}
