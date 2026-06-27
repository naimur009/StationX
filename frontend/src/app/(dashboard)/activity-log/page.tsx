'use client';

import { useState } from 'react';
import { useActivityLogs } from '@/features/activity-log/api';
import ActivityLogFilters from '@/features/activity-log/components/ActivityLogFilters';
import ActivityLogFeed from '@/features/activity-log/components/ActivityLogFeed';
import type { ActivityLogFilters as Filters } from '@/features/activity-log/schema';

export default function ActivityLogPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useActivityLogs(filters);

  function handleFilterChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">
          Activity Log
        </h1>
      </div>
      <ActivityLogFilters onFiltersChange={handleFilterChange} />
      <ActivityLogFeed
        data={data?.data ?? []}
        meta={data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 }}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
