import { formatCurrency } from '@/lib/format';
import type { DashboardTopItemsResponse } from '../api';

interface TopItemsListProps {
  data: DashboardTopItemsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export default function TopItemsList({
  data,
  isLoading,
  isError,
  onRetry,
}: TopItemsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">Top Items</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">Top Items</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-500">Failed to load top items.</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(var(--primary-hover))]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items = data?.data?.topItems ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-slate-800">Top Items</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No items sold in this period.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.productId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-slate-500">{item.unitsSold} sold</span>
                  <span className="w-20 font-semibold text-slate-800">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
