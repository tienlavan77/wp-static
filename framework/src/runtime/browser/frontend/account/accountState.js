export function normalizeAccountSession(payload, user) {
  return {
    addresses: payload?.addresses || user?.addresses || {},
    orders: payload?.orders || [],
    user: user || null
  };
}
