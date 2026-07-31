import createUserDiagnosticPresentation from "../../shared/diagnostics/createUserDiagnosticPresentation.js";

export function json(payload, options = {}) {
  return new Response(JSON.stringify(presentDiagnostics(payload)), {
    headers: options.headers,
    status: options.status ?? 200
  });
}

function presentDiagnostics(payload) {
  if (!payload?.diagnostics || typeof payload !== "object") return payload;

  return {
    ...payload,
    diagnostics: {
      ...payload.diagnostics,
      errors: presentDiagnosticList(payload.diagnostics.errors),
      warnings: presentDiagnosticList(payload.diagnostics.warnings)
    }
  };
}

function presentDiagnosticList(items) {
  return Array.isArray(items)
    ? items.map((item) => ({ ...item, presentation: item.presentation ?? createUserDiagnosticPresentation(item) }))
    : [];
}

export function responseStatus(payload, fallback = 200) {
  return isHttpStatus(payload?.status) ? payload.status : fallback;
}

export function isHttpErrorStatus(value) {
  return isHttpStatus(value) && value >= 400;
}

export function isHttpStatus(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
