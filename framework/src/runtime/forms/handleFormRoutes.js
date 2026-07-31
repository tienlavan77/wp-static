import { json, readJson, responseStatus } from "../api/runtimeResponse.js";

export default async function handleFormRoutes(pathname, request, context) {
  const match = pathname.match(/^\/forms\/([^/]+)$/);
  if (!match) return null;
  const formId = decodeURIComponent(match[1]);

  try {
    if (request.method === "GET") return json(await context.formsService.read(formId), { headers: context.headers });
    if (request.method === "POST") {
      const result = await context.formsService.submit(formId, await readJson(request), {
        sessionId: context.session.id,
        siteId: context.siteId,
        userId: context.session.user?.id ?? null
      });
      return json(result, { headers: context.headers, status: responseStatus(result, result.diagnostics?.errors?.length ? 400 : 200) });
    }
  } catch (cause) {
    return json({ diagnostics: { errors: [{ code: "forms.definition.unavailable", message: cause.message, severity: "error" }], warnings: [] }, ok: false }, { headers: context.headers, status: 404 });
  }
  return null;
}
