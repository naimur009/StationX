'use client';

import { useState, useMemo } from 'react';
import { CalendarDays, Users, Gift, Minus, CircleCheck } from 'lucide-react';
import { useSalaryReport, useEmployeeReport, type EmployeeMonthData } from '../api';
import { useEmployeesList } from '@/features/employees/api';
import { Badge } from '@/components/ui/badge';
import MonthDetailDialog from './MonthDetailDialog';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status: string): { variant: 'green' | 'yellow' | 'red' | 'slate'; label: string } {
  switch (status) {
    case 'paid':
      return { variant: 'green', label: 'Paid' };
    case 'active':
      return { variant: 'yellow', label: 'Partial' };
    case 'cancelled':
      return { variant: 'red', label: 'Cancelled' };
    case 'no_salary':
      return { variant: 'slate', label: 'No Salary' };
    default:
      return { variant: 'red', label: status.charAt(0).toUpperCase() + status.slice(1) };
  }
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
  iconClassName?: string;
}

function StatCard({ label, value, icon: Icon, valueClassName = 'text-slate-800', iconClassName = 'text-slate-400' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold sm:text-2xl ${valueClassName}`}>{value}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
  );
}

const selectClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring';

export default function SalaryReport() {
  const now = useMemo(() => new Date(), []);
  const [monthFilter, setMonthFilter] = useState<number>(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | number>('all');
  const [selectedMonth, setSelectedMonth] = useState<EmployeeMonthData | null>(null);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, [now]);

  const { data: reportData, isLoading: reportLoading, isError: reportError } = useSalaryReport({
    month: monthFilter,
    year: yearFilter,
  });

  const { data: employeesData } = useEmployeesList({ page: 1, limit: 100 });

  const employees = useMemo(() => {
    if (!employeesData?.data) return [];
    return employeesData.data
      .map((e) => ({ id: e.id, name: e.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employeesData]);

  const { data: empReportData, isLoading: empReportLoading } = useEmployeeReport({
    employeeId: selectedEmployeeId,
    year: yearFilter,
  });

  const report = reportData?.data;
  const empReport = empReportData?.data;

  const sortedEmployees = useMemo(() => {
    if (!report?.employees) return [];
    return [...report.employees].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [report]);

  const filteredEmployees = viewMode === 'all'
    ? sortedEmployees
    : sortedEmployees.filter((e) => {
      if (viewMode === 1) return e.totalPaid === 0;
      if (viewMode === 2) return e.totalPaid > 0 && e.totalPaid < e.baseSalary;
      if (viewMode === 3) return e.totalPaid >= e.baseSalary;
      return true;
    });

  const annualHeading = useMemo(() => {
    if (!selectedEmployeeId) return `Annual Salary Overview — ${yearFilter}`;
    const name = empReport?.employeeName && empReport.employeeName !== 'Unknown'
      ? empReport.employeeName
      : employees.find((e) => e.id === selectedEmployeeId)?.name;
    if (!name || name === 'Unknown') return 'Employee information unavailable';
    return `${name} — Salary Overview ${yearFilter}`;
  }, [selectedEmployeeId, empReport, employees, yearFilter]);

  const selectedEmployeeName = useMemo(() => {
    if (!selectedEmployeeId) return '';
    const name = empReport?.employeeName && empReport.employeeName !== 'Unknown'
      ? empReport.employeeName
      : employees.find((e) => e.id === selectedEmployeeId)?.name;
    return name && name !== 'Unknown' ? name : '';
  }, [selectedEmployeeId, empReport, employees]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-800">{MONTHS[monthFilter - 1]} {yearFilter}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={monthFilter} onChange={(e) => setMonthFilter(Number(e.target.value))} className={selectClass}>
            {MONTHS.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(Number(e.target.value)); setSelectedEmployeeId(''); setSelectedMonth(null); }}
            className={selectClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={selectedEmployeeId}
            onChange={(e) => { setSelectedEmployeeId(e.target.value); setSelectedMonth(null); }}
            className={selectClass}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className={selectClass}
          >
            <option value="all">All Status</option>
            <option value={1}>Unpaid</option>
            <option value={2}>Partially Paid</option>
            <option value={3}>Paid</option>
          </select>
        </div>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : reportError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load salary report
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          No data for this period
        </div>
      ) : (
        <>
          {/* Overview */}
          <section className="space-y-3">
            <SectionHeading>Overview</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
              <StatCard label="Total Paid" value={formatCurrency(report.grandTotalPaid)} icon={CircleCheck} iconClassName="bg-green-100 text-green-600" valueClassName="text-green-600" />
              <StatCard label="Bonus" value={formatCurrency(report.grandTotalBonus)} icon={Gift} iconClassName="bg-green-100 text-green-600" valueClassName="text-green-600" />
              <StatCard label="Deduction" value={formatCurrency(report.grandTotalCut)} icon={Minus} iconClassName="bg-red-100 text-red-500" valueClassName="text-red-500" />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5" />
              {report.employeeCount} employee{report.employeeCount === 1 ? '' : 's'} in this period
            </p>
          </section>

          {/* Employee Summary */}
          <section className="space-y-3">
            <SectionHeading>Employee Summary</SectionHeading>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 [&_tr>th:first-child]:rounded-tl-2xl [&_tr>th:last-child]:rounded-tr-2xl">
                  <tr className="text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5 text-right">Paid</th>
                    <th className="px-5 py-3.5 text-right">Bonus</th>
                    <th className="px-5 py-3.5 text-right">Cut</th>
                    <th className="px-5 py-3.5 text-right">Net</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 [&_tr:last-child>td:first-child]:rounded-bl-2xl [&_tr:last-child>td:last-child]:rounded-br-2xl">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                        No employees match the filter
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.employeeId} className="transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                              {emp.employeeName
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0]?.toUpperCase() ?? '')
                                .join('') || '?'}
                            </span>
                            <span className="font-medium text-slate-800">{emp.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-green-600 whitespace-nowrap">
                          {emp.totalPaid > 0 ? formatCurrency(emp.totalPaid) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-green-600 whitespace-nowrap">
                          {emp.totalBonus > 0 ? formatCurrency(emp.totalBonus) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-red-500 whitespace-nowrap">
                          {emp.totalCut > 0 ? formatCurrency(emp.totalCut) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {emp.netSalary > 0 ? formatCurrency(emp.netSalary) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusBadge(emp.salaryStatus).variant}>{statusBadge(emp.salaryStatus).label}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Annual Breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{annualHeading}</h2>

        {!selectedEmployeeId ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">
              Select an employee to view their month-by-month annual breakdown.
            </p>
          </div>
        ) : empReportLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
          </div>
        ) : empReport ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 [&_tr>th:first-child]:rounded-tl-2xl [&_tr>th:last-child]:rounded-tr-2xl">
                <tr className="text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3.5">Month</th>
                  <th className="px-5 py-3.5 text-right">Net Salary</th>
                  <th className="px-5 py-3.5 text-right">Paid</th>
                  <th className="px-5 py-3.5 text-right">Remaining</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&_tr:last-child>td:first-child]:rounded-bl-2xl [&_tr:last-child>td:last-child]:rounded-br-2xl">
                {empReport.months.map((m) => {
                  const badge = statusBadge(m.status);
                  const isClickable = m.baseSalary > 0 || m.adjustments.length > 0 || m.totalPaid > 0;
                  return (
                    <tr
                      key={m.month}
                      onClick={() => isClickable && setSelectedMonth(m)}
                      className={`transition-colors ${isClickable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {MONTHS[m.month - 1]}
                        {isClickable && (
                          <span className="ml-2 text-xs text-slate-400">View</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {m.netSalary > 0 ? formatCurrency(m.netSalary) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-green-600 whitespace-nowrap">
                        {m.totalPaid > 0 ? formatCurrency(m.totalPaid) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap">
                        {m.remainingBalance > 0 ? (
                          <span className="text-amber-600">{formatCurrency(m.remainingBalance)}</span>
                        ) : m.baseSalary > 0 ? (
                          <span className="text-green-600">0</span>
                        ) : (
                          <span className="text-xs font-normal text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">
              No salary data available for this employee in {yearFilter}
            </p>
          </div>
        )}
      </section>

      <MonthDetailDialog
        open={!!selectedMonth}
        month={selectedMonth}
        employeeName={selectedEmployeeName || 'Employee'}
        year={yearFilter}
        onClose={() => setSelectedMonth(null)}
      />
    </div>
  );
}
