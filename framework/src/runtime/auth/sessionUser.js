export function normalizeSessionUser(user) {
  if (!user?.id) {
    throw new Error("Auth login handler must return user.id.");
  }

  return {
    displayName: user.displayName ?? user.name ?? user.username ?? user.email ?? "",
    email: user.email ?? "",
    emailVerified: user.emailVerified ?? false,
    id: user.id,
    roles: Array.isArray(user.roles) ? user.roles : []
  };
}
