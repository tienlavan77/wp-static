import deepFreeze from "../../shared/deepFreeze.js";

export const CUSTOMER_IDENTITY_SCHEMA = "wpsc.customer-identity";
export const CUSTOMER_IDENTITY_VERSION = 1;

export default function createCustomerIdentity(input = {}) {
  const siteId = String(input.siteId ?? "").trim();
  const customerId = input.customerId ?? input.user?.id ?? null;
  if (!siteId) throw new TypeError("Customer Identity requires a Site id.");
  if (customerId === null || customerId === undefined || String(customerId).trim() === "") {
    throw new TypeError("Authenticated Customer Identity requires a Customer id.");
  }

  return deepFreeze({
    authenticated: true,
    authenticatedAt: input.authenticatedAt ?? new Date().toISOString(),
    customerId: String(customerId),
    profileReference: {
      customerId: String(customerId),
      provider: input.provider ?? "wordpress-woocommerce"
    },
    provider: input.provider ?? "wordpress-woocommerce",
    schema: CUSTOMER_IDENTITY_SCHEMA,
    schemaVersion: CUSTOMER_IDENTITY_VERSION,
    siteId,
    user: { ...(input.user ?? {}) }
  });
}
