'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, User,
  Loader2, AlertTriangle, Check, X, Clock, Moon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useEmployeeAttendanceMonth, useTodayStaff } from '../api';

const STATUS_META: Record<string, { label: string; bg: string; dot: string; icon: React.ElementType }> = {
  present: { label: 'Present', bg: 'bg-green-500', dot: 'bg-green-500', icon: Check },
  absent: { label: 'Absent', bg: 'bg-red-500', dot: 'bg-red-500', icon: X },
  late: { label: 'Late', bg: 'bg-amber-500', dot: 'bg-amber-500', icon: Clock },
  'half-day': { label: 'Half Day', bg: 'bg-blue-500', dot: 'bg-blue-500', icon: Moon },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayKey() {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function isWeekend(i: number) { return i === 0 || i === 6; }

export default function AttendanceCalendar() {
  const now = new Date();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, isError, refetch } = useEmployeeAttendanceMonth(selectedEmployeeId, year, month);
  const { data: todayData } = useTodayStaff();

  const employees = useMemo(() =>
    (todayData?.staff || []).map((s) => ({ id: s.employee._id, name: s.employee.name })),
    [todayData]
  );
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const records = data?.data || [];

  const recordMap = useMemo(() => {
    const map = new Map<string, (typeof records)[0]>();
    for (const r of records) map.set(r.date.slice(0, 10), r);
    return map;
  }, [records]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayKey();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const stats = useMemo(() => {
    let p = 0, a = 0, l = 0, h = 0, u = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      const rec = recordMap.get(key);
      if (rec) {
        if (rec.status === 'present') p++;
        else if (rec.status === 'absent') a++;
        else if (rec.status === 'late') l++;
        else if (rec.status === 'half-day') h++;
      } else if (new Date(year, month - 1, d) <= now) u++;
    }
    return { present: p, absent: a, late: l, halfDay: h, unmarked: u, total: p + a + l + h };
  }, [recordMap, year, month, daysInMonth, now]);

  const goPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const goNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const weeks = useMemo(() => {
    const cells: Array<{ day: number | null; dateKey: string; rec: (typeof records)[0] | null; isToday: boolean; isPast: boolean }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateKey: '', rec: null, isToday: false, isPast: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      cells.push({ day: d, dateKey: key, rec: recordMap.get(key) || null, isToday: key === today, isPast: new Date(year, month - 1, d) <= now });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, dateKey: '', rec: null, isToday: false, isPast: false });
    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [firstDay, daysInMonth, year, month, recordMap, today, now]);

  const recordedDays = stats.total;
  const presenceRate = recordedDays > 0 ? Math.round(((stats.present + stats.late + stats.halfDay) / daysInMonth) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Monthly Report</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedEmployeeId ? `${selectedEmployee?.name || 'Staff'}'s attendance` : 'Select a staff member to view'}
              </p>
            </div>
          </div>
          {isCurrentMonth && (
            <Button variant="outline" size="sm" onClick={() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth() + 1); }} className="w-full sm:w-auto">
              Today
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* User selector */}
        <div className="border-b border-border/20 bg-slate-50/50 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <Select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full sm:w-64 text-sm" placeholder="Select staff">
              <option value="">Select a staff member</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {!selectedEmployeeId && (
          <div className="flex flex-col items-center gap-4 px-5 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
              <User className="h-7 w-7 text-purple-300" />
            </div>
            <p className="text-sm text-slate-400">Choose a staff member above to see their monthly attendance</p>
          </div>
        )}

        {selectedEmployeeId && isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        )}

        {selectedEmployeeId && isError && (
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-500">Failed to load attendance data</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {selectedEmployeeId && !isLoading && !isError && (
          <div className="p-5">
            {/* Month nav */}
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={goPrevMonth}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <div className="text-center">
                <span className="text-base font-bold text-slate-800">{MONTH_NAMES[month - 1]}</span>
                <span className="text-sm text-slate-400 ml-1.5">{year}</span>
              </div>
              <button type="button" onClick={goNextMonth}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-5 gap-2">
              <StatCard label="Present" count={stats.present} total={recordedDays} color="green" icon={Check} />
              <StatCard label="Absent" count={stats.absent} total={recordedDays} color="red" icon={X} />
              <StatCard label="Late" count={stats.late} total={recordedDays} color="amber" icon={Clock} />
              <StatCard label="Half Day" count={stats.halfDay} total={recordedDays} color="blue" icon={Moon} />
              <StatCard label="Pending" count={stats.unmarked} total={daysInMonth} color="slate" icon={CalendarDays} />
            </div>

            {/* Rate + summary */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2">
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span><span className="font-semibold text-slate-800">{presenceRate}%</span> presence</span>
                <span className="hidden sm:inline"><span className="font-semibold text-slate-800">{stats.present + stats.late + stats.halfDay}</span> days attended</span>
              </div>
              <span className="text-xs text-slate-400">{recordedDays}/{daysInMonth} days recorded</span>
            </div>

            {/* Calendar grid */}
            <div>
              <div className="mb-1 grid grid-cols-7">
                {DAY_NAMES.map((name, i) => (
                  <div key={name} className={`py-1.5 text-center text-xs font-semibold uppercase tracking-wider ${isWeekend(i) ? 'text-slate-300' : 'text-slate-500'}`}>
                    {name}
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-0.5">
                    {week.map((cell, ci) => {
                      if (cell.day === null) return <div key={`e-${wi}-${ci}`} />;
                      const status = cell.rec?.status;
                      const meta = status ? STATUS_META[status] : null;
                      return (
                        <div key={cell.day} className="group relative">
                          <div
                            className={`flex h-9 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all duration-100
                              ${meta ? `${meta.bg} text-white shadow-sm` : cell.isPast ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-300'}
                              ${cell.isToday && !meta ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                              ${cell.isToday && meta ? 'ring-2 ring-white ring-offset-1' : ''}
                            `}
                          >
                            {cell.day}
                          </div>
                          {cell.rec && (
                            <div className="absolute left-1/2 z-30 hidden -translate-x-1/2 group-hover:block pointer-events-none" style={{ bottom: 'calc(100% + 4px)' }}>
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg whitespace-nowrap">
                                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1 mb-1">
                                  <span className={`inline-block h-2 w-2 rounded-full ${meta?.dot || 'bg-slate-300'}`} />
                                  <span className="font-semibold text-slate-700">{meta?.label}</span>
                                </div>
                                {cell.rec.checkInAt && <p className="text-slate-500">In: {new Date(cell.rec.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
                                {cell.rec.checkOutAt && <p className="text-slate-500">Out: {new Date(cell.rec.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
                                {!cell.rec.checkInAt && !cell.rec.checkOutAt && <p className="text-slate-400 italic">No timestamps</p>}
                                {cell.rec.notes && <p className="mt-1 max-w-36 truncate border-t border-slate-100 pt-1 italic text-slate-400">{cell.rec.notes}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/20 pt-3">
              <span className="text-xs font-medium text-slate-500">Legend</span>
              {Object.entries(STATUS_META).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${val.dot} shadow-sm`} />
                  <span className="text-xs text-slate-500">{val.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-200 shadow-sm" />
                <span className="text-xs text-slate-500">No record</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Stat card ─────────────────────────────────────── */

function StatCard({ label, count, total, color, icon: Icon }: { label: string; count: number; total: number; color: string; icon: React.ElementType }) {
  const colors: Record<string, { bg: string; text: string; border: string; iconCls: string }> = {
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', iconCls: 'text-green-500' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', iconCls: 'text-red-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconCls: 'text-amber-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconCls: 'text-blue-500' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', iconCls: 'text-slate-400' },
  };
  const c = colors[color] || colors.slate;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={`flex flex-col items-center gap-1 rounded-lg border ${c.border} ${c.bg} px-2 py-2 sm:py-2.5`}>
      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.iconCls}`} />
      <span className={`text-xs sm:text-sm font-bold tabular-nums ${c.text}`}>{count}</span>
      <span className={`text-[10px] sm:text-xs ${c.text} opacity-75`}>{pct}%</span>
      <span className="text-[10px] text-slate-400 -mt-0.5 truncate max-w-full hidden sm:block">{label}</span>
      <span className="text-[10px] text-slate-400 -mt-0.5 truncate max-w-full sm:hidden">{label}</span>
    </div>
  );
}
