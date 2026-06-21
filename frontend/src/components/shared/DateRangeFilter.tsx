'use client';

import { type DateRange } from '@/hooks/useDateRangeFilter';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
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
}: DateRangeFilterProps) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === range.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
