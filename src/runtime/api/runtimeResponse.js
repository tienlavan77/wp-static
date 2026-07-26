export function json(payload, options = {}) {
  return new Response(JSON.stringify(payload), {
    headers: options.headers,
    status: options.status ?? 200
  });
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
