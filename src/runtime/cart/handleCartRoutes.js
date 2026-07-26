import { json, readJson } from "../api/runtimeResponse.js";
import { normalizeCartItem } from "./cartItems.js";

export default async function handleCartRoutes(pathname, request, context) {
  const { headers, session } = context;

  if (pathname === "/cart" && request.method === "GET") {
    return json({ items: session.cart }, { headers });
  }

  if (pathname === "/cart/items" && request.method === "POST") {
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

  if (pathname.startsWith("/cart/items/") && request.method === "DELETE") {
    const productId = decodeURIComponent(pathname.replace("/cart/items/", ""));
    session.cart = session.cart.filter((item) => String(item.productId) !== productId);

    return json({ items: session.cart }, { headers });
  }

  return null;
}
