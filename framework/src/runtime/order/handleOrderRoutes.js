import { json, readJson, responseStatus } from "../api/runtimeResponse.js";

export default async function handleOrderRoutes(pathname, request, context) {
  const { headers, session } = context;

  if (pathname === "/orders/lookup" && request.method === "POST") {
    const payload = await readJson(request);
    const order = await context.orderLookup({
      contact: payload.contact,
      orderId: payload.orderId ?? payload.order,
      payload,
      session
    });

    return json(order, { headers, status: responseStatus(order) });
  }

  if (pathname.startsWith("/orders/") && request.method === "GET") {
    const orderId = decodeURIComponent(pathname.replace("/orders/", ""));
    const order = await context.orderLookup({
      orderId,
      session
    });

    return json(order, { headers });
  }

  return null;
}
