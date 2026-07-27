export default function createSetupSessionRepository(options = {}) {
  const sessions = options.sessions || new Map();

  return {
    has(sessionId) {
      return sessions.has(sessionId);
    },

    list() {
      return [...sessions.values()];
    },

    read(sessionId) {
      return sessions.get(sessionId) || null;
    },

    write(session) {
      sessions.set(session.id, session);
      return session;
    }
  };
}
