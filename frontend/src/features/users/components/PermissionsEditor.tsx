'use client';

import { useCallback } from 'react';
import { MODULE_ACTIONS, ALL_ACTIONS, getModuleLabel, getActionLabel } from '@/lib/constants';

interface PermissionEntry {
  module: string;
  actions: string[];
}

interface PermissionsEditorProps {
  value: PermissionEntry[];
  onChange: (permissions: PermissionEntry[]) => void;
}

export default function PermissionsEditor({ value, onChange }: PermissionsEditorProps) {
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
          {Object.entries(MODULE_ACTIONS).map(([module, validActions]) => {
            const current = getActionsForModule(module);
            const allSelected = validActions.every((a) => current.includes(a));

            return (
              <tr key={module} className="hover:bg-muted">
                <td className="px-3 py-2.5 font-medium text-foreground">
                  {getModuleLabel(module)}
                </td>
                {ALL_ACTIONS.map((action) => {
                  const isDisabled = !validActions.includes(action);
                  const checked = current.includes(action);

                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={checked}
                        onChange={() => handleToggle(module, action)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring disabled:opacity-30"
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected && validActions.length > 0}
                    onChange={() => handleRowSelectAll(module, validActions)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
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
