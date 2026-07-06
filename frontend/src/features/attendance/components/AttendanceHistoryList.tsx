'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, ClipboardList, SlidersHorizontal, X, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAttendanceList, type AttendanceRecord } from '../api';
import { useEmployeesList } from '../../employees/api';

const statusBadge: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'slate'> = {
  present: 'green',
  absent: 'red',
  late: 'yellow',
  'half-day': 'blue',
};

interface AttendanceHistoryListProps {
  onCorrect?: (id: string) => void;
}

export default function AttendanceHistoryList({ onCorrect }: AttendanceHistoryListProps = {}) {
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const mountedRef = useRef(true);

  const { data: employeesData } = useEmployeesList({ limit: 100 });

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) setDebouncedSearch(search);
    }, 300);
    return () => { mountedRef.current = false; clearTimeout(timer); };
  }, [search]);

  useEffect(() => { setPage(1); }, [employeeId, status, from, to, debouncedSearch]);

  const { data, isLoading, isError, refetch } = useAttendanceList({
    page,
    limit: 20,
    employeeId: employeeId || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const records = data?.data || [];
  const meta = data?.meta;
  const hasActiveFilters = employeeId || status || from || to || debouncedSearch;

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Attendance History</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {meta ? `${meta.total} record${meta.total !== 1 ? 's' : ''} found` : 'Filter and review past records'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="ml-1 flex h-2 w-2 rounded-full bg-blue-500" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Filters panel — collapsible */}
        <div className={`border-b border-border/50 transition-all duration-200 overflow-hidden ${showFilters ? 'max-h-96' : 'max-h-0'}`}>
          <div className="p-4 space-y-3">
            {/* Search row */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter grid */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">All Staff</option>
                {(employeesData?.data || []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </Select>

              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
              </Select>

              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setEmployeeId(''); setStatus(''); setFrom(''); setTo(''); setSearch(''); }}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-3 py-4 last:border-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-12 animate-pulse rounded bg-slate-100 hidden sm:block" />
                <div className="h-4 w-12 animate-pulse rounded bg-slate-100 hidden sm:block" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-3 px-4 py-12">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-500">Failed to load attendance history</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && records.length === 0 && (
          <div className="px-4 py-12 text-center">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No attendance records found</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setEmployeeId(''); setStatus(''); setFrom(''); setTo(''); setSearch(''); }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Records */}
        {!isLoading && !isError && records.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {records.map((record) => (
                <MobileRecordCard key={record.id} record={record} onCorrect={onCorrect} formatDate={formatDate} formatTime={formatTime} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5 pl-6">Date</th>
                    <th className="px-4 py-3.5">Staff</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">In</th>
                    <th className="px-4 py-3.5">Out</th>
                    <th className="px-4 py-3.5">Marked By</th>
                    {onCorrect && <th className="px-4 py-3.5 pr-6 w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 pl-6 text-slate-600 whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {record.employee ? (
                            <>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                                {record.employee.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{record.employee.name}</span>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400 italic">Deleted employee</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusBadge[record.status] || 'slate'}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formatTime(record.checkInAt)}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formatTime(record.checkOutAt)}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{record.markedBy?.name || '--'}</td>
                      {onCorrect && (
                        <td className="px-4 py-3.5 pr-6">
                          <button
                            type="button"
                            onClick={() => onCorrect(record.id)}
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95"
                          >
                            Correct
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && (
              <div className="flex flex-col gap-3 border-t border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-xs text-slate-500 sm:text-left">
                  Page {meta.page} of {totalPages}
                  <span className="ml-1.5 text-slate-400">({meta.total} total)</span>
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </button>

                  {/* Page numbers — show max 5 on mobile, more on desktop */}
                  <div className="hidden sm:flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all active:scale-95 ${
                            pageNum === page
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Mobile record card ────────────────────────────── */

function MobileRecordCard({
  record,
  onCorrect,
  formatDate,
  formatTime,
}: {
  record: AttendanceRecord;
  onCorrect?: (id: string) => void;
  formatDate: (iso: string) => string;
  formatTime: (iso: string | null) => string;
}) {
  return (
    <div className="px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {record.employee ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                {record.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{record.employee.name}</p>
                <p className="text-xs text-slate-400">{formatDate(record.date)}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-400 italic">Deleted employee</p>
              <p className="text-xs text-slate-400">{formatDate(record.date)}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge[record.status] || 'slate'}>
            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
          </Badge>
          {onCorrect && (
            <button
              type="button"
              onClick={() => onCorrect(record.id)}
              className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          In: {formatTime(record.checkInAt)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Out: {formatTime(record.checkOutAt)}
        </span>
        {record.markedBy && <span>by {record.markedBy.name}</span>}
      </div>
      {record.notes && (
        <p className="mt-2 text-xs text-slate-400 italic truncate">{record.notes}</p>
      )}
    </div>
  );
}
