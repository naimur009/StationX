'use client';

import { useState, useMemo } from 'react';
import { useSalaryReport, useEmployeeReport } from '../api';
import { useEmployeesList } from '@/features/employees/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  active: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'no_salary') return <span className="text-xs text-slate-400">&mdash;</span>;
  const style = STATUS_STYLES[status] ?? 'bg-red-100 text-red-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SalaryReport() {
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState<number>(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | number>(0);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {MONTHS.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>{name}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(Number(e.target.value)); setSelectedEmployeeId('') }}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Employees</option>
          <option value={1}>Unpaid</option>
          <option value={2}>Partially Paid</option>
          <option value={3}>Paid</option>
        </select>

        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring min-w-[220px]"
        >
          <option value="">Select Employee for Details</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent spinner-smooth" />
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-slate-500">Employees</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{report.employeeCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-slate-500">Total Salary</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(report.grandTotalBaseSalary)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-slate-500">Total Bonus</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(report.grandTotalBonus)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-slate-500">Total Cut</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-red-500">{formatCurrency(report.grandTotalCut)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-slate-500">Net Salary</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(report.grandTotalNet)}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Base Salary</th>
                  <th className="px-4 py-3 text-right">Bonus</th>
                  <th className="px-4 py-3 text-right">Cut</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No employees match the filter</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <tr key={emp.employeeId + '-' + idx} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{emp.employeeName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {emp.baseSalary > 0 ? formatCurrency(emp.baseSalary) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {emp.totalBonus > 0 ? formatCurrency(emp.totalBonus) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">
                        {emp.totalCut > 0 ? formatCurrency(emp.totalCut) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {emp.netSalary > 0 ? formatCurrency(emp.netSalary) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {emp.totalPaid > 0 ? formatCurrency(emp.totalPaid) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={emp.salaryStatus} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedEmployeeId && empReport && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">{empReport.employeeName} — {yearFilter}</h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(() => {
              let totalBase = 0, totalBonus = 0, totalCut = 0, totalPaid = 0, monthCount = 0;
              for (const m of empReport.months) {
                totalBase += m.baseSalary; totalBonus += m.totalBonus; totalCut += m.totalCut; totalPaid += m.totalPaid;
                if (m.baseSalary > 0) monthCount++;
              }
              return (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs text-slate-500">Months with Salary</span>
                    <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{monthCount}/12</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs text-slate-500">Total Salary</span>
                    <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(totalBase)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs text-slate-500">Total Bonus</span>
                    <p className="mt-1 text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(totalBonus)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs text-slate-500">Total Cut</span>
                    <p className="mt-1 text-xl sm:text-2xl font-bold text-red-500">{formatCurrency(totalCut)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs text-slate-500">Net Salary</span>
                    <p className="mt-1 text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(totalBase + totalBonus - totalCut)}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {empReportLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent spinner-smooth" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Salary</th>
                    <th className="px-4 py-3 text-right">Bonus</th>
                    <th className="px-4 py-3 text-right">Cut</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empReport.months.map((m) => (
                    <tr key={m.month} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{MONTHS[m.month - 1]}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {m.baseSalary > 0 ? formatCurrency(m.baseSalary) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {m.totalBonus > 0 ? formatCurrency(m.totalBonus) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">
                        {m.totalCut > 0 ? formatCurrency(m.totalCut) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {m.netSalary > 0 ? formatCurrency(m.netSalary) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {m.totalPaid > 0 ? formatCurrency(m.totalPaid) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {m.remainingBalance > 0 ? (
                          <span className="text-amber-600">{formatCurrency(m.remainingBalance)}</span>
                        ) : m.baseSalary > 0 ? (
                          <span className="text-green-600">0</span>
                        ) : (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {m.adjustments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {m.adjustments.map((adj) => (
                              <span key={adj.id} className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${adj.type === 'bonus' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {adj.type === 'bonus' ? '+' : '-'}{formatCurrency(adj.amount)} — {adj.reason}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}