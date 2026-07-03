'use client';

import { TrendingUp, type LucideIcon } from 'lucide-react';
import { REPORT_TYPES, REPORT_TYPE_LABELS, type ReportType } from '../schema';

const TYPE_ICONS: Record<ReportType, LucideIcon> = {
  sales: TrendingUp,
  profit: TrendingUp,
};

interface ReportTypeSelectorProps {
  selected: ReportType;
  onChange: (type: ReportType) => void;
}

export default function ReportTypeSelector({ selected, onChange }: ReportTypeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {REPORT_TYPES.map((type) => {
        const Icon = TYPE_ICONS[type];
        const isActive = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {REPORT_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
