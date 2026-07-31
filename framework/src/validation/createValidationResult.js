export const VALIDATION_STATUS = {
  ERROR: "error",
  OK: "ok",
  WARNING: "warning"
};

export function createOk(name, detail, options = {}) {
  return createValidationResult({
    ...options,
    detail,
    name,
    status: VALIDATION_STATUS.OK
  });
}

export function createWarning(name, detail, options = {}) {
  return createValidationResult({
    ...options,
    detail,
    name,
    status: VALIDATION_STATUS.WARNING
  });
}

export function createError(name, detail, options = {}) {
  return createValidationResult({
    ...options,
    detail,
    name,
    status: VALIDATION_STATUS.ERROR
  });
}

export default function createValidationResult(options = {}) {
  const status = normalizeStatus(options.status);

  return {
    category: options.category ?? "general",
    detail: String(options.detail ?? ""),
    fix: options.fix ? String(options.fix) : null,
    name: String(options.name ?? "Validation check"),
    ok: status !== VALIDATION_STATUS.ERROR,
    status,
    summary: options.summary ? String(options.summary) : String(options.detail ?? "")
  };
}

export function summarizeValidationResults(results = []) {
  return results.reduce((summary, result) => {
    const status = normalizeStatus(result.status);

    return {
      ...summary,
      [status]: summary[status] + 1,
      total: summary.total + 1
    };
  }, {
    error: 0,
    ok: 0,
    total: 0,
    warning: 0
  });
}

function normalizeStatus(status) {
  if (status === VALIDATION_STATUS.ERROR || status === "fail") {
    return VALIDATION_STATUS.ERROR;
  }

  if (status === VALIDATION_STATUS.WARNING || status === "warn") {
    return VALIDATION_STATUS.WARNING;
  }

  return VALIDATION_STATUS.OK;
}
