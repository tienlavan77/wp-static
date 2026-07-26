import { json, readJson, responseStatus } from "../api/runtimeResponse.js";

export default async function handleCheckoutRoutes(pathname, request, context) {
  const { headers, session } = context;

  if (pathname === "/checkout" && request.method === "POST") {
    const payload = await readJson(request);
    const checkout = await context.checkoutProxy({
      cart: session.cart,
      payload,
      session
    });

    return json(checkout, { headers, status: responseStatus(checkout) });
  }

  return null;
}
