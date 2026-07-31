import { json, readJson } from "../api/runtimeResponse.js";

export default async function handleCartRoutes(pathname, request, context) {
  const { headers, session } = context;
  const cart = context.cartService;

  if (pathname === "/cart" && request.method === "GET") {
    return json(cart.read(session), { headers });
  }

  if (pathname === "/cart/items" && request.method === "POST") {
    return json(cart.add(session, await readJson(request)), { headers, status: 201 });
  }

  if (pathname === "/cart/refresh" && request.method === "POST") return json(await cart.refresh(session), { headers });

  if (pathname === "/cart" && request.method === "DELETE") return json(cart.clear(session), { headers });

  if (pathname.startsWith("/cart/items/") && ["PATCH", "PUT"].includes(request.method)) {
    const key = decodeURIComponent(pathname.replace("/cart/items/", ""));
    const result = cart.update(session, key, await readJson(request));
    return json(result, { headers, status: result.ok === false ? 400 : 200 });
  }

  if (pathname.startsWith("/cart/items/") && request.method === "DELETE") {
    const key = decodeURIComponent(pathname.replace("/cart/items/", ""));
    return json(cart.remove(session, key), { headers });
  }

  return null;
}
