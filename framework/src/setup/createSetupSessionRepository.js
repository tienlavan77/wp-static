export default function createSetupSessionRepository(options = {}) {
  const sessions = options.sessions || new Map();

  return {
    create(session) {
      sessions.set(session.id, session);
      return session;
    },

    delete(sessionId) {
      return sessions.delete(sessionId);
    },

    find(sessionId) {
      return sessions.get(sessionId) || null;
    },

    list() {
      return [...sessions.values()];
    }
  };
}
