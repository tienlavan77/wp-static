export default function normalizeAccountPayload(account, sessionUser) {
  if (!account || account.status === 501) {
    return {
      addresses: {},
      orders: [],
      user: sessionUser
    };
  }

  return {
    addresses: account.addresses ?? account.user?.addresses ?? {},
    orders: Array.isArray(account.orders) ? account.orders : [],
    user: {
      ...sessionUser,
      ...(account.user ?? account.customer ?? {})
    }
  };
}
