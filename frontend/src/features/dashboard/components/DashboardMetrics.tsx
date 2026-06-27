import { DollarSign, ShoppingBag, ShoppingCart } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { formatCurrency } from '@/lib/format';
import type { DashboardMetricsResponse } from '../api';

interface DashboardMetricsProps {
  data: DashboardMetricsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export default function DashboardMetrics({
  data,
  isLoading,
  isError,
  onRetry,
}: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-500">Failed to load metrics</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(var(--primary-hover))]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.data?.metrics;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        title="Total Earned"
        value={formatCurrency(metrics?.totalEarned ?? 0)}
        icon={DollarSign}
        color="green"
      />
      <MetricCard
        title="Products Sold"
        value={metrics?.totalProductsSold ?? 0}
        icon={ShoppingBag}
        color="blue"
      />
      <MetricCard
        title="Orders Completed"
        value={metrics?.totalOrdersCompleted ?? 0}
        icon={ShoppingCart}
        color="indigo"
      />
    </div>
  );
}
