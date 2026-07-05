import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DashboardMetricsResponse {
  data: {
    range: { from: string; to: string };
    metrics: {
      totalEarned: number;
      totalProductsSold: number;
      totalOrdersCompleted: number;
    };
  };
}

export interface TopItem {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface DashboardTopItemsResponse {
  data: {
    range: { from: string; to: string };
    topItems: TopItem[];
  };
}

export function useDashboardMetrics(filter: { range: string; from?: string; to?: string }) {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);

  return useQuery({
    queryKey: ['dashboard', 'metrics', params.toString()],
    queryFn: () => apiClient<DashboardMetricsResponse>(`/dashboard/metrics?${params.toString()}`),
    enabled: filter.range !== 'custom' || (!!filter.from && !!filter.to),
  });
}

export function useDashboardTopItems(
  filter: { range: string; from?: string; to?: string },
  limit = 10
) {
  const params = new URLSearchParams({ range: filter.range, limit: String(limit) });
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);

  return useQuery({
    queryKey: ['dashboard', 'top-items', params.toString()],
    queryFn: () => apiClient<DashboardTopItemsResponse>(`/dashboard/top-items?${params.toString()}`),
    enabled: filter.range !== 'custom' || (!!filter.from && !!filter.to),
  });
}
