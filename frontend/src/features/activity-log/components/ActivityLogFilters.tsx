'use client';

import { useState, useEffect, useRef } from 'react';
import { MODULE_ACTIONS } from '@/lib/constants';
import type { ActivityLogFilters } from '../schema';

interface ActivityLogFiltersProps {
  onFiltersChange: (filters: Partial<ActivityLogFilters>) => void;
}

const MODULE_OPTIONS = Object.keys(MODULE_ACTIONS).sort();

export default function ActivityLogFilters({ onFiltersChange }: ActivityLogFiltersProps) {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ search: search || undefined });
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, onFiltersChange]);

  function handleModuleChange(value: string) {
    setModule(value);
    onFiltersChange({ module: value || undefined });
  }

  function handleActionChange(value: string) {
    setAction(value);
    onFiltersChange({ action: value || undefined });
  }

  function handleFromChange(value: string) {
    setFrom(value);
    onFiltersChange({ from: value || undefined, to: to || undefined });
  }

  function handleToChange(value: string) {
    setTo(value);
    onFiltersChange({ from: from || undefined, to: value || undefined });
  }

  const inputClass = 'rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-ring focus:border-blue-500';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Search descriptions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={inputClass + ' w-full sm:w-48'}
        aria-label="Search descriptions"
      />
      <select
        value={module}
        onChange={(e) => handleModuleChange(e.target.value)}
        className={inputClass + ' w-full sm:w-40'}
        aria-label="Filter by module"
      >
        <option value="">All modules</option>
        {MODULE_OPTIONS.map((mod) => (
          <option key={mod} value={mod}>
            {mod}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="e.g. user., order."
        value={action}
        onChange={(e) => handleActionChange(e.target.value)}
        className={inputClass + ' w-full sm:w-44'}
        aria-label="Action prefix"
        title="Prefix match — user. matches all user actions"
      />
      <input
        type="date"
        value={from}
        onChange={(e) => handleFromChange(e.target.value)}
        className={inputClass + ' w-full sm:w-auto'}
        aria-label="From date"
      />
      <input
        type="date"
        value={to}
        onChange={(e) => handleToChange(e.target.value)}
        className={inputClass + ' w-full sm:w-auto'}
        aria-label="To date"
      />
    </div>
  );
}
