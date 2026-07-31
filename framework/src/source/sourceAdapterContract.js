export const SOURCE_ADAPTER_CONTRACT_VERSION = "1.0";

export const SourceAdapterMethod = Object.freeze({
  GET_METADATA: "getMetadata",
  HEALTH_CHECK: "healthCheck",
  INITIALIZE: "initialize",
  REGISTER_WEBHOOK: "registerWebhook",
  UNREGISTER_WEBHOOK: "unregisterWebhook",
  VALIDATE: "validate",
  VERIFY_WEBHOOK: "verifyWebhook"
});

export const SOURCE_ADAPTER_REQUIRED_METHODS = Object.freeze(
  Object.values(SourceAdapterMethod)
);

export function validateSourceAdapter(adapter) {
  const errors = [];

  if (!adapter || typeof adapter !== "object") {
    errors.push({
      code: "source.adapter.invalid",
      message: "Source adapter must be an object.",
      severity: "error"
    });
  } else {
    for (const method of SOURCE_ADAPTER_REQUIRED_METHODS) {
      if (typeof adapter[method] !== "function") {
        errors.push({
          code: "source.adapter.method.required",
          field: method,
          message: `Source adapter must implement ${method}().`,
          severity: "error"
        });
      }
    }
  }

  return { errors, ok: errors.length === 0 };
}

export function assertSourceAdapter(adapter) {
  const validation = validateSourceAdapter(adapter);

  if (!validation.ok) {
    const error = new TypeError("Source adapter contract is invalid.");
    error.code = "source.adapter.contract.invalid";
    error.diagnostics = validation.errors;
    throw error;
  }

  return adapter;
}
