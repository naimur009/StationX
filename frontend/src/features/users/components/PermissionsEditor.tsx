'use client';

import { useCallback } from 'react';
import { MODULE_ACTIONS, ALL_ACTIONS, getModuleLabel, getActionLabel } from '@/lib/constants';

interface PermissionEntry {
  module: string;
  actions: string[];
  impliedBy?: string;
}

interface PermissionsEditorProps {
  value: PermissionEntry[];
  impliedPermissions?: PermissionEntry[];
  onChange: (permissions: PermissionEntry[]) => void;
}

export default function PermissionsEditor({ value, impliedPermissions = [], onChange }: PermissionsEditorProps) {
  const explicitModules = new Set(value.map((p) => p.module));

  const getActionsForModule = useCallback(
    (module: string): string[] => {
      const perms = value ?? [];
      const entry = perms.find((p) => p.module === module);
      return entry?.actions ?? [];
    },
    [value]
  );

  function handleToggle(module: string, action: string) {
    const current = getActionsForModule(module);
    const has = current.includes(action);
    const updated = has ? current.filter((a) => a !== action) : [...current, action];
    setModuleActions(module, updated);
  }

  function handleRowSelectAll(module: string, validActions: readonly string[]) {
    const current = getActionsForModule(module);
    const allSelected = validActions.every((a) => current.includes(a));

    if (allSelected) {
      setModuleActions(module, []);
    } else {
      setModuleActions(module, [...validActions]);
    }
  }

  function setModuleActions(module: string, actions: string[]) {
    const filtered = value.filter((p) => p.module !== module);
    if (actions.length > 0) {
      filtered.push({ module, actions });
    }
    onChange(filtered);
  }

  function isImplied(module: string): PermissionEntry | undefined {
    return impliedPermissions.find((p) => p.module === module);
  }

  function isParentStillChecked(implied: PermissionEntry): boolean {
    return implied.impliedBy ? explicitModules.has(implied.impliedBy) : false;
  }

  const allModuleEntries = Object.entries(MODULE_ACTIONS);

  const allActiveEntries = allModuleEntries.filter(([module]) => {
    const implied = isImplied(module);
    if (implied && isParentStillChecked(implied)) return true;
    const current = getActionsForModule(module);
    return current.length > 0;
  });

  const allInactiveEntries = allModuleEntries.filter(([module]) => {
    const implied = isImplied(module);
    if (implied && isParentStillChecked(implied)) return false;
    const current = getActionsForModule(module);
    return current.length === 0;
  });

  const sortedEntries = [...allActiveEntries, ...allInactiveEntries];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-xs font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2.5">Module</th>
            {ALL_ACTIONS.map((action) => (
              <th key={action} className="px-3 py-2.5 text-center">
                {getActionLabel(action)}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center">All</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedEntries.map(([module, validActions]) => {
            const implied = isImplied(module);
            const isDisabled = !!implied && isParentStillChecked(implied);
            const current = isDisabled
              ? implied!.actions
              : getActionsForModule(module);
            const allSelected = validActions.every((a) => current.includes(a));

            return (
              <tr
                key={module}
                className={`hover:bg-muted ${isDisabled ? 'opacity-50' : ''}`}
                title={
                  implied && isParentStillChecked(implied)
                    ? `Auto-granted because of ${getModuleLabel(implied.impliedBy!)} access.`
                    : undefined
                }
              >
                <td className="px-3 py-2.5 font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    {getModuleLabel(module)}
                    {implied && isParentStillChecked(implied) && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        auto
                      </span>
                    )}
                  </span>
                </td>
                {ALL_ACTIONS.map((action) => {
                  const isActionDisabled = !validActions.includes(action) || isDisabled;
                  const checked = current.includes(action);

                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        disabled={isActionDisabled}
                        checked={checked}
                        onChange={() => {
                          if (!isDisabled) handleToggle(module, action);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring disabled:opacity-30"
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    disabled={isDisabled}
                    checked={allSelected && validActions.length > 0}
                    onChange={() => {
                      if (!isDisabled) handleRowSelectAll(module, validActions);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring disabled:opacity-30"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
