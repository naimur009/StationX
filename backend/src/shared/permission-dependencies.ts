export interface PermissionEntry {
  module: string;
  actions: string[];
  impliedBy?: string;
}

export const PERMISSION_DEPENDENCIES: Record<string, { module: string; actions: string[] }[]> = {
  salary: [
    { module: 'employees', actions: ['view'] },
  ],
};

export function expandPermissions(submitted: PermissionEntry[]): PermissionEntry[] {
  const result: PermissionEntry[] = [];
  const seenModules = new Set<string>();

  for (const entry of submitted) {
    result.push({ ...entry });
    seenModules.add(entry.module);
  }

  for (const entry of submitted) {
    const deps = PERMISSION_DEPENDENCIES[entry.module];
    if (!deps) continue;

    for (const dep of deps) {
      const existing = result.find((r) => r.module === dep.module);
      if (existing) {
        for (const action of dep.actions) {
          if (!existing.actions.includes(action)) {
            existing.actions.push(action);
          }
        }
      } else if (!seenModules.has(dep.module)) {
        result.push({
          module: dep.module,
          actions: [...dep.actions],
          impliedBy: entry.module,
        });
        seenModules.add(dep.module);
      }
    }
  }

  return result;
}

export function expandPermissionsForUser(existingPermissions: PermissionEntry[]): PermissionEntry[] {
  const primaries = existingPermissions.filter((p) => !p.impliedBy);
  return expandPermissions(primaries);
}
