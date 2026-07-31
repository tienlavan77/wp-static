export default function normalizeAccountPayload(account, sessionUser, identity = null) {
  if (!account || account.status === 501) {
    return {
      addresses: {},
      identity,
      orders: [],
      user: sessionUser
    };
  }

  return {
    addresses: account.addresses ?? account.user?.addresses ?? {},
    identity,
    orders: Array.isArray(account.orders) ? account.orders : [],
    user: {
      ...sessionUser,
      ...(account.user ?? account.customer ?? {})
    }
  };
}
