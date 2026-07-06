'use client';

import { useState, useCallback } from 'react';
import { CheckSquare, Loader2, Users, Calendar, Clock, XCircle, AlertTriangle, Moon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTodayStaff, useMarkAttendance, useBatchMarkAttendance, type StaffAttendanceItem } from '../api';
import { AppError } from '@/lib/utils';

function getDateString(d?: Date): string {
  const date = d || new Date();
  return date.toISOString().split('T')[0];
}

const statusConfig: Record<string, { active: string; inactive: string; icon: React.ElementType; label: string }> = {
  present: {
    active: 'bg-green-500 text-white shadow-green-500/30 ring-1 ring-green-600/20',
    inactive: 'bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 active:bg-green-200',
    icon: CheckSquare,
    label: 'Present',
  },
  absent: {
    active: 'bg-red-500 text-white shadow-red-500/30 ring-1 ring-red-600/20',
    inactive: 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 active:bg-red-200',
    icon: XCircle,
    label: 'Absent',
  },
  late: {
    active: 'bg-amber-500 text-white shadow-amber-500/30 ring-1 ring-amber-600/20',
    inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 active:bg-amber-200',
    icon: Clock,
    label: 'Late',
  },
  'half-day': {
    active: 'bg-blue-500 text-white shadow-blue-500/30 ring-1 ring-blue-600/20',
    inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 active:bg-blue-200',
    icon: Moon,
    label: 'Half Day',
  },
};

const statuses = ['present', 'absent', 'late', 'half-day'] as const;

export default function TodayAttendanceSheet() {
  const [selectedDate, setSelectedDate] = useState(getDateString());
  const { data, isLoading, isError, refetch } = useTodayStaff(selectedDate);
  const markMutation = useMarkAttendance();
  const batchMutation = useBatchMarkAttendance();
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleMark = useCallback(async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day') => {
    setPendingEmployeeId(employeeId);
    try {
      await markMutation.mutateAsync({ employeeId, status, date: selectedDate });
      showTempMessage('Attendance marked successfully');
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Failed to mark attendance';
      showTempMessage(msg, true);
    } finally {
      setPendingEmployeeId(null);
    }
  }, [markMutation, selectedDate]);

  const handleQuickStatus = useCallback(async (employeeId: string, currentStatus: string | undefined) => {
    const next = currentStatus === 'present' ? 'absent' : 'present';
    handleMark(employeeId, next as 'present' | 'absent');
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
      showTempMessage(`${unmarked.length} staff marked present`);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Failed to mark all present';
      showTempMessage(msg, true);
    }
  }, [batchMutation, data, selectedDate]);

  const summary = data?.summary;
  const staff = data?.staff || [];
  const isMutating = markMutation.isPending || batchMutation.isPending;
  const isToday = selectedDate === getDateString();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
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
                  <CheckSquare className="mr-1.5 h-4 w-4" />
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
          <div className="mx-4 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <SummaryStat label="Present" count={summary.present} color="green" />
            <SummaryStat label="Absent" count={summary.absent} color="red" />
            <SummaryStat label="Late" count={summary.late} color="amber" />
            <SummaryStat label="Half Day" count={summary.halfDay} color="blue" />
            <SummaryStat label="Unmarked" count={summary.unmarked} color="slate" className="col-span-2 sm:col-span-1" />
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

        {/* Staff list — responsive: cards on mobile, table on md+ */}
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
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5 pl-6">Staff</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">In</th>
                    <th className="px-4 py-3.5">Out</th>
                    <th className="px-4 py-3.5">Marked By</th>
                    <th className="px-4 py-3.5 pr-6">Quick</th>
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

/* ─── Summary stat pill ─────────────────────────────── */

function SummaryStat({ label, count, color, className }: { label: string; count: number; color: string; className?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${colors[color]} ${className || ''}`}>
      <span className="font-medium">{label}</span>
      <span className="text-base font-bold tabular-nums">{count}</span>
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
  onMark: (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day') => void;
  onQuickStatus: (employeeId: string, currentStatus: string | undefined) => void;
  isMutating: boolean;
  isPending: boolean;
}) {
  const currentStatus = item.attendance?.status;
  const rec = item.attendance;

  return (
    <tr className={`border-b border-slate-100 last:border-0 transition-opacity ${isPending ? 'opacity-50' : 'hover:bg-slate-50/50'}`}>
      <td className="px-4 py-3.5 pl-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
            {item.employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-800">{item.employee.name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((status) => {
            const isActive = currentStatus === status;
            const cfg = statusConfig[status];
            return (
              <button
                key={status}
                type="button"
                disabled={isMutating}
                onClick={() => onMark(item.employee._id, status)}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed active:scale-95 ${
                  isActive ? cfg.active : cfg.inactive
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3.5 text-slate-500 text-xs">
        {rec?.checkInAt ? new Date(rec.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-300">--</span>}
      </td>
      <td className="px-4 py-3.5 text-slate-500 text-xs">
        {rec?.checkOutAt ? new Date(rec.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-300">--</span>}
      </td>
      <td className="px-4 py-3.5 text-xs text-slate-400">
        {rec?.markedBy?.name || <span className="text-slate-300">--</span>}
      </td>
      <td className="px-4 py-3.5 pr-6">
        <button
          type="button"
          disabled={isMutating}
          onClick={() => onQuickStatus(item.employee._id, currentStatus)}
          className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : currentStatus === 'present' ? (
            'Mark Absent'
          ) : (
            'Mark Present'
          )}
        </button>
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
  onQuickStatus: (employeeId: string, currentStatus: string | undefined) => void;
  onMark: (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day') => void;
  isMutating: boolean;
  isPending: boolean;
}) {
  const currentStatus = item.attendance?.status;
  const rec = item.attendance;

  return (
    <div className={`px-4 py-4 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-sm">
            {item.employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{item.employee.name}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={isMutating}
          onClick={() => onQuickStatus(item.employee._id, currentStatus)}
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentStatus === 'present' ? (
            'Mark Absent'
          ) : (
            'Mark Present'
          )}
        </button>
      </div>

      {/* Times row */}
      <div className="mb-3 flex gap-4 text-xs text-slate-400">
        <span>In: {rec?.checkInAt ? new Date(rec.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
        <span>Out: {rec?.checkOutAt ? new Date(rec.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
        {rec?.markedBy && <span>by {rec.markedBy.name}</span>}
      </div>

      {/* Status pills — scrollable if needed */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {statuses.map((status) => {
          const isActive = currentStatus === status;
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              type="button"
              disabled={isMutating}
              onClick={() => onMark(item.employee._id, status)}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed active:scale-95 ${
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
