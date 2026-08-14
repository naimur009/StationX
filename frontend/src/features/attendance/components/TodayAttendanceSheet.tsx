'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, Loader2, Users, Calendar, Clock, XCircle, AlertTriangle, Moon,
  UserCheck, UserX, BadgeCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTodayStaff, useMarkAttendance, useBatchMarkAttendance, useUpdateAttendance, type StaffAttendanceItem } from '../api';
import { getSocket } from '@/lib/socket';
import { AppError } from '@/lib/utils';

function getDateString(d?: Date): string {
  const date = d || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const statusConfig: Record<string, { active: string; inactive: string; icon: React.ElementType; label: string; ring: string; chip: string }> = {
  present: {
    active: 'bg-green-100 text-green-700 shadow-sm ring-1 ring-green-600/30',
    inactive: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-green-50 hover:text-green-700 hover:ring-green-300',
    icon: CheckSquare,
    label: 'Present',
    ring: 'ring-green-500',
    chip: 'bg-green-50 text-green-700',
  },
  absent: {
    active: 'bg-red-100 text-red-700 shadow-sm ring-1 ring-red-600/30',
    inactive: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-700 hover:ring-red-300',
    icon: XCircle,
    label: 'Absent',
    ring: 'ring-red-500',
    chip: 'bg-red-50 text-red-700',
  },
  late: {
    active: 'bg-amber-100 text-amber-700 shadow-sm ring-1 ring-amber-600/30',
    inactive: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-300',
    icon: Clock,
    label: 'Late',
    ring: 'ring-amber-500',
    chip: 'bg-amber-50 text-amber-700',
  },
  'half-day': {
    active: 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-600/30',
    inactive: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-300',
    icon: Moon,
    label: 'Half Day',
    ring: 'ring-blue-500',
    chip: 'bg-blue-50 text-blue-700',
  },
};

const statuses = ['present', 'absent', 'late', 'half-day'] as const;

export default function TodayAttendanceSheet() {
  const [selectedDate, setSelectedDate] = useState(getDateString());
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useTodayStaff(selectedDate);
  const markMutation = useMarkAttendance();
  const batchMutation = useBatchMarkAttendance();
  const updateMutation = useUpdateAttendance();
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    };
    socket.on('attendance:marked', handler);
    socket.on('attendance:updated', handler);
    return () => {
      socket.off('attendance:marked', handler);
      socket.off('attendance:updated', handler);
    };
  }, [queryClient]);

  const showTempMessage = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setErrorMessage(null);
      setSuccessMessage(null);
    }, 3000);
  };

  const refreshAfterMutation = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleMark = useCallback(async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day', recordId?: string) => {
    setPendingEmployeeId(employeeId);
    try {
      if (recordId) {
        await updateMutation.mutateAsync({ id: recordId, status });
      } else {
        await markMutation.mutateAsync({ employeeId, status, date: selectedDate });
      }
      await refreshAfterMutation();
      showTempMessage('Attendance marked successfully');
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Failed to mark attendance';
      showTempMessage(msg, true);
    } finally {
      setPendingEmployeeId(null);
    }
  }, [markMutation, updateMutation, selectedDate, refreshAfterMutation]);

  const handleQuickStatus = useCallback(async (employeeId: string, currentStatus: string | undefined, recordId?: string) => {
    const next = currentStatus === 'present' ? 'absent' : 'present';
    handleMark(employeeId, next as 'present' | 'absent', recordId);
  }, [handleMark]);

  const handleMarkAllPresent = useCallback(async () => {
    if (!data?.staff) return;
    const unmarked = data.staff.filter((s) => !s.attendance);
    if (unmarked.length === 0) {
      showTempMessage('All staff already marked');
      return;
    }
    try {
      await batchMutation.mutateAsync({
        date: selectedDate,
        records: unmarked.map((s) => ({ employeeId: s.employee._id, status: 'present' as const })),
      });
      await refreshAfterMutation();
      showTempMessage(`${unmarked.length} staff marked present`);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Failed to mark all present';
      showTempMessage(msg, true);
    }
  }, [batchMutation, data, selectedDate, refreshAfterMutation]);

  const summary = data?.summary;
  const staff = data?.staff || [];
  const isMutating = markMutation.isPending || batchMutation.isPending || isRefreshing;
  const isToday = selectedDate === getDateString();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Staff Attendance</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {isToday ? "Today's roll call" : `Roll call for ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-44 pl-9 text-sm"
              />
            </div>
            {summary && summary.unmarked > 0 && (
              <Button
                variant="success"
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={isMutating}
                className="w-full sm:w-auto"
              >
                {batchMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="mr-1.5 h-4 w-4" />
                )}
                Mark All Present
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages */}
        {errorMessage && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in slide-in-from-top-1">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 animate-in slide-in-from-top-1">
            <CheckSquare className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Summary stat bar */}
        {summary && (
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <SummaryStat label="Present" count={summary.present} color="green" icon={CheckSquare} />
            <SummaryStat label="Absent" count={summary.absent} color="red" icon={XCircle} />
            <SummaryStat label="Late" count={summary.late} color="amber" icon={Clock} />
            <SummaryStat label="Half Day" count={summary.halfDay} color="blue" icon={Moon} />
            <SummaryStat label="Unmarked" count={summary.unmarked} color="slate" icon={Users} className="col-span-2 sm:col-span-1" />
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-3 py-4 last:border-0">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-7 w-16 animate-pulse rounded-lg bg-slate-200" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center gap-3 px-4 py-12">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-500">Failed to load staff attendance</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && staff.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No staff members found</p>
          </div>
        )}

        {/* Staff list — cards on mobile, table on md+ */}
        {!isLoading && !isError && staff.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {staff.map((item) => (
                <StaffCard
                  key={item.employee._id}
                  item={item}
                  onQuickStatus={handleQuickStatus}
                  onMark={handleMark}
                  isMutating={isMutating}
                  isPending={pendingEmployeeId === item.employee._id}
                />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5 pl-6">Staff</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 pr-6 text-right">Quick</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((item) => (
                    <StaffRow
                      key={item.employee._id}
                      item={item}
                      onMark={handleMark}
                      onQuickStatus={handleQuickStatus}
                      isMutating={isMutating}
                      isPending={pendingEmployeeId === item.employee._id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Bottom padding */}
        {!isLoading && !isError && staff.length > 0 && <div className="h-4" />}
      </CardContent>
    </Card>
  );
}

/* ─── Summary stat card ─────────────────────────────── */

function SummaryStat({ label, count, color, icon: Icon, className }: { label: string; count: number; color: string; icon: React.ElementType; className?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    slate: 'bg-slate-100 text-slate-500',
  };
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-sm sm:p-4 ${className || ''}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums text-slate-800 sm:text-xl">{count}</p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/* ─── Desktop row ───────────────────────────────────── */

function StaffRow({
  item,
  onMark,
  onQuickStatus,
  isMutating,
  isPending,
}: {
  item: StaffAttendanceItem;
  onMark: (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day', recordId?: string) => void;
  onQuickStatus: (employeeId: string, currentStatus: string | undefined, recordId?: string) => void;
  isMutating: boolean;
  isPending: boolean;
}) {
  const currentStatus = item.attendance?.status;
  const avatarRing = currentStatus ? statusConfig[currentStatus].ring : 'ring-slate-200';

  return (
    <tr className={`border-b border-slate-100 last:border-0 transition-colors ${isPending ? 'opacity-50' : 'hover:bg-slate-50/60'}`}>
      <td className="px-4 py-3.5 pl-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary text-xs font-bold text-white shadow-sm ring-2 ${avatarRing}`}>
            {item.employee.name.charAt(0).toUpperCase()}
          </div>
          <p className="font-medium text-slate-800">{item.employee.name}</p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5 whitespace-nowrap">
          {statuses.map((status) => {
            const isActive = currentStatus === status;
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            return (
              <button
                key={status}
                type="button"
                disabled={isMutating}
                onClick={() => onMark(item.employee._id, status, item.attendance?.id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed active:scale-95 ${
                  isActive ? cfg.active : cfg.inactive
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3.5 pr-6">
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isMutating}
onClick={() => onQuickStatus(item.employee._id, currentStatus, item.attendance?.id)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : currentStatus === 'present' ? (
              <>
                <UserX className="h-3.5 w-3.5" />
                Mark Absent
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Mark Present
              </>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─── Mobile card ───────────────────────────────────── */

function StaffCard({
  item,
  onQuickStatus,
  onMark,
  isMutating,
  isPending,
}: {
  item: StaffAttendanceItem;
  onQuickStatus: (employeeId: string, currentStatus: string | undefined, recordId?: string) => void;
  onMark: (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day', recordId?: string) => void;
  isMutating: boolean;
  isPending: boolean;
}) {
  const currentStatus = item.attendance?.status;
  const currentMeta = currentStatus ? statusConfig[currentStatus] : null;
  const avatarRing = currentMeta ? currentMeta.ring : 'ring-slate-200';

  return (
    <div className={`px-4 py-4 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary text-sm font-bold text-white shadow-sm ring-2 ${avatarRing}`}>
            {item.employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{item.employee.name}</p>
            {currentMeta && (
              <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${currentMeta.chip}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${currentMeta.ring}`} />
                {currentMeta.label}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={isMutating}
          onClick={() => onQuickStatus(item.employee._id, currentStatus, item.attendance?.id)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentStatus === 'present' ? (
            <>
              <UserX className="h-3.5 w-3.5" />
              Mark Absent
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5" />
              Mark Present
            </>
          )}
        </button>
      </div>

      {/* Status buttons */}
      <div className="grid grid-cols-2 gap-2">
        {statuses.map((status) => {
          const isActive = currentStatus === status;
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              type="button"
              disabled={isMutating}
              onClick={() => onMark(item.employee._id, status, item.attendance?.id)}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed active:scale-95 ${
                isActive ? cfg.active : cfg.inactive
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}