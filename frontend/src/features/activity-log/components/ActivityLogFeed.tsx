'use client';

import Link from 'next/link';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ActivityLogAvatar from './ActivityLogAvatar';
import type { ActivityLogEntry, ActivityLogMeta } from '../schema';

interface ActivityLogFeedProps {
  data: ActivityLogEntry[];
  meta: ActivityLogMeta;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

const TARGET_ROUTES: Record<string, string> = {
  Order: '/orders/',
  User: '/users/',
  Task: '/tasks/',
  Attendance: '/attendance/',
  Expense: '/expenses/',
  Vendor: '/vendors/',
  Product: '/products/',
  Coupon: '/coupons/',
  Customer: '/customers/',
};

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  const date = new Date(isoString);
  const nowYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  if (date.getFullYear() !== nowYear) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('en-US', options);
}

function renderTargetLink(targetType: string | null, targetId: string | null) {
  if (!targetType || !targetId) return null;

  const route = TARGET_ROUTES[targetType];
  if (route) {
    return (
      <Link
        href={`${route}${targetId}`}
        className="text-xs text-[hsl(var(--primary))] hover:underline"
      >
        View {targetType} #{targetId.slice(-6)}
      </Link>
    );
  }

  return (
    <span className="text-xs text-slate-400">
      {targetType}: {targetId}
    </span>
  );
}

export default function ActivityLogFeed({
  data,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: ActivityLogFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-3 w-48 rounded bg-slate-200" />
              </div>
              <div className="h-3 w-12 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-500">
          Failed to load activity log.
        </p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-12 text-center">
        <History className="mb-3 h-12 w-12 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          No activity recorded for this filter.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Try adjusting your filter criteria.
        </p>
      </div>
    );
  }

  const startItem = (meta.page - 1) * meta.limit + 1;
  const endItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {data.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <ActivityLogAvatar name={entry.actor?.name ?? null} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {entry.actor?.name ?? 'System'}
                  </span>
                  <span
                    className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]"
                    title={new Date(entry.createdAt).toISOString()}
                  >
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="slate">{entry.module}</Badge>
                  <Badge variant="slate">{entry.action}</Badge>
                </div>
                <p className="mt-1.5 text-sm font-medium text-[hsl(var(--foreground))]">
                  {entry.description}
                </p>
                {renderTargetLink(entry.targetType, entry.targetId)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {meta.totalPages > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {startItem}–{endItem} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
