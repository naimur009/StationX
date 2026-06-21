export function hasPermission(
  user: { role: string; permissions: { module: string; actions: string[] }[] } | null,
  module: string,
  action: string
): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  const permission = user.permissions.find((p) => p.module === module);

  if (!permission) {
    return false;
  }

  return permission.actions.includes(action);
}
