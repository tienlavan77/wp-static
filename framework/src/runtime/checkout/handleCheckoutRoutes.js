import { json, readJson, responseStatus } from "../api/runtimeResponse.js";

export default async function handleCheckoutRoutes(pathname, request, context) {
  const { headers, session } = context;

  if (pathname === "/checkout" && request.method === "GET") {
    return json(context.checkoutService.read(session), { headers });
  }

  if (pathname === "/checkout" && request.method === "POST") {
    const payload = await readJson(request);
    const checkout = await context.checkoutService.submit(session, payload);

    return json(checkout, { headers, status: responseStatus(checkout, checkout?.diagnostics?.errors?.length ? 400 : 200) });
  }

  return null;
}
