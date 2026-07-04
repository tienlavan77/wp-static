import crypto from "node:crypto";

export default function createSessionStore() {
  const sessions = new Map();

  return {
    create() {
      const id = crypto.randomUUID();
      const session = {
        cart: [],
        createdAt: new Date().toISOString(),
        id
      };

      sessions.set(id, session);

      return session;
    },

    get(id) {
      if (!id) {
        return null;
      }

      return sessions.get(id) ?? null;
    },

    getOrCreate(id) {
      return this.get(id) ?? this.create();
    }
  };
}
