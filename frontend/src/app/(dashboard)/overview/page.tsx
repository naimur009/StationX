'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PermissionGate from '@/components/shared/PermissionGate';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { useDashboardMetrics, useDashboardTopItems } from '@/features/dashboard/api';
import DashboardMetrics from '@/features/dashboard/components/DashboardMetrics';
import TopItemsList from '@/features/dashboard/components/TopItemsList';
import QuickAccess from '@/features/dashboard/components/QuickAccess';
import { getSocket } from '@/lib/socket';

export default function OverviewPage() {
  const { filter, setRange, setCustomRange } = useDateRangeFilter('today');
  const metricsQuery = useDashboardMetrics(filter);
  const topItemsQuery = useDashboardTopItems(filter);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    socket.on('dashboard:metricsInvalidate', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });
    return () => {
      socket.off('dashboard:metricsInvalidate');
    };
  }, [queryClient]);

  return (
    <PermissionGate module="dashboard" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Dashboard</h1>
          <DateRangeFilter
            value={filter.range}
            onChange={setRange}
            onCustomRange={setCustomRange}
          />
        </div>

        <DashboardMetrics
          data={metricsQuery.data}
          isLoading={metricsQuery.isLoading}
          isError={metricsQuery.isError}
          onRetry={metricsQuery.refetch}
        />

        <TopItemsList
          data={topItemsQuery.data}
          isLoading={topItemsQuery.isLoading}
          isError={topItemsQuery.isError}
          onRetry={topItemsQuery.refetch}
        />

        <QuickAccess />
      </div>
    </PermissionGate>
  );
}
