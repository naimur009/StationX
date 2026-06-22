'use client';

import { useState } from 'react';
import { type DateRange } from '@/hooks/useDateRangeFilter';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onCustomRange?: (from: string, to: string) => void;
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

export default function DateRangeFilter({
  value,
  onChange,
  onCustomRange,
}: DateRangeFilterProps) {
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  function handleCustomApply() {
    if (customFrom && customTo && onCustomRange) {
      onCustomRange(customFrom, customTo);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {RANGES.map((range) => (
          <button
            key={range.value}
            type="button"
            onClick={() => {
              onChange(range.value);
              if (range.value !== 'custom') {
                setCustomFrom('');
                setCustomTo('');
              }
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              value === range.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(var(--primary-hover))] disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
