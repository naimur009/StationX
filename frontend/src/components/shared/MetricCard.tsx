import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type MetricColor = 'blue' | 'indigo' | 'green' | 'red' | 'yellow' | 'slate';

const colorConfig: Record<MetricColor, { iconBg: string; value: string }> = {
  blue: { iconBg: 'bg-primary', value: 'text-primary' },
  indigo: { iconBg: 'bg-info', value: 'text-info' },
  green: { iconBg: 'bg-success', value: 'text-success' },
  red: { iconBg: 'bg-destructive', value: 'text-destructive' },
  yellow: { iconBg: 'bg-warning', value: 'text-warning' },
  slate: { iconBg: 'bg-slate-600', value: 'text-slate-600' },
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: MetricColor;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  className,
}: MetricCardProps) {
  const colors = colorConfig[color];

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={cn(
              'font-bold text-2xl sm:text-3xl',
              colors.value
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl shadow-md',
            colors.iconBg
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}