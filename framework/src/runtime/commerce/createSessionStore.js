import crypto from "node:crypto";

export const CUSTOMER_SESSION_SCHEMA = "wpsc.customer-session";
export const CUSTOMER_SESSION_VERSION = 1;

export default function createSessionStore(options = {}) {
  const siteId = String(options.siteId ?? "default").trim();
  if (!siteId) throw new TypeError("Customer Session Store requires a Site id.");
  const sessions = new Map();

  return {
    create() {
      const id = crypto.randomUUID();
      const session = {
        cart: [],
        createdAt: new Date().toISOString(),
        id,
        identity: null,
        schema: CUSTOMER_SESSION_SCHEMA,
        schemaVersion: CUSTOMER_SESSION_VERSION,
        siteId
      };

      sessions.set(id, session);

      return session;
    },

    get(id) {
      if (!id) {
        return null;
      }

      const session = sessions.get(id) ?? null;
      return session?.siteId === siteId ? session : null;
    },

    getOrCreate(id) {
      return this.get(id) ?? this.create();
    },

    destroy(id) {
      if (!id) {
        return false;
      }

      return sessions.delete(id);
    },
    siteId
  };
}
