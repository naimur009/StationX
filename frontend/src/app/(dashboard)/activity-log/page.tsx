'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useActivityLogs, useClearActivityLog } from '@/features/activity-log/api';
import ActivityLogFilters from '@/features/activity-log/components/ActivityLogFilters';
import ActivityLogFeed from '@/features/activity-log/components/ActivityLogFeed';
import PermissionGate from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ActivityLogFilters as Filters } from '@/features/activity-log/schema';

export default function ActivityLogPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useActivityLogs(filters);
  const clearMutation = useClearActivityLog();

  function handleFilterChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  async function handleClear() {
    try {
      await clearMutation.mutateAsync();
      setConfirmOpen(false);
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">
          Activity Log
        </h1>
        <PermissionGate module="activity-log" action="delete">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Clear All
          </Button>
        </PermissionGate>
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

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Clear Activity Log"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClear}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Clearing...' : 'Clear All'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This will permanently delete all activity log entries. This action
          cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
