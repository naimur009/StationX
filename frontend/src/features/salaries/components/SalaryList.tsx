'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Eye, Trash2, DollarSign, Plus, Gift, Minus } from 'lucide-react';
import { useSalariesList, useAdjustmentsList, useDeleteAdjustment, type SalaryResponse, type AdjustmentResponse } from '../api';
import { useEmployeesList } from '@/features/employees/api';
import { Badge } from '@/components/ui/badge';
import PermissionGate from '@/components/shared/PermissionGate';
import { AppError } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SalaryListProps {
  onAddAdvance: (salary: SalaryResponse) => void;
  onViewDetail: (salary: SalaryResponse) => void;
  onDelete: (salary: SalaryResponse) => void;
  onPay: (employeeId: string) => void;
  onAddBonus?: (employeeId: string, month: number, year: number) => void;
  onAddCut?: (employeeId: string, month: number, year: number) => void;
}

interface EmployeeRow {
  employeeId: string;
  employeeName: string;
  employeeBaseSalary: number;
  salary: SalaryResponse | null;
}

export default function SalaryList({ onAddAdvance, onViewDetail, onDelete, onPay, onAddBonus, onAddCut }: SalaryListProps) {
  const now = new Date();
  const deleteAdjustment = useDeleteAdjustment();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());
  const [paymentFilter, setPaymentFilter] = useState('');

  const { data: employeesData } = useEmployeesList({ page: 1, limit: 100 });
  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const queryParams = {
    page: 1,
    limit: 100,
    month: monthFilter,
    year: yearFilter,
  };

  const { data, isLoading, isError } = useSalariesList(queryParams);

  const { data: adjustmentsData } = useAdjustmentsList({
    month: monthFilter,
    year: yearFilter,
    limit: 500,
  });

  const adjustmentTotals = useMemo(() => {
    const map = new Map<string, { totalBonus: number; totalCut: number; bonuses: AdjustmentResponse[]; cuts: AdjustmentResponse[] }>();
    if (adjustmentsData?.data) {
      for (const adj of adjustmentsData.data) {
        const current = map.get(adj.employeeId) ?? { totalBonus: 0, totalCut: 0, bonuses: [], cuts: [] };
        if (adj.type === 'bonus') {
          current.totalBonus += adj.amount;
          current.bonuses.push(adj);
        } else {
          current.totalCut += adj.amount;
          current.cuts.push(adj);
        }
        map.set(adj.employeeId, current);
      }
    }
    return map;
  }, [adjustmentsData]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  const salaryMap = useMemo(() => {
    const map = new Map<string, SalaryResponse>();
    if (data?.data) {
      for (const s of data.data) {
        if (s.employeeId) {
          map.set(s.employeeId._id, s);
        }
      }
    }
    return map;
  }, [data]);

  type PaymentState = 'unpaid' | 'paid' | 'partially_paid';

  function getPaymentState(row: EmployeeRow): PaymentState {
    const salary = row.salary;
    if (!salary || salary.totalPaid === 0) return 'unpaid';
    if (salary.totalPaid >= salary.baseSalary) return 'paid';
    return 'partially_paid';
  }

  const rows: EmployeeRow[] = useMemo(() => {
    const all: EmployeeRow[] = employees.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeBaseSalary: emp.baseSalary,
      salary: salaryMap.get(emp.id) ?? null,
    }));

    if (paymentFilter) {
      return all.filter((row) => getPaymentState(row) === paymentFilter);
    }

    return all;
  }, [employees, salaryMap, paymentFilter]);

  const paymentBadge: Record<PaymentState, { variant: 'green' | 'yellow' | 'red' | 'slate'; label: string }> = {
    unpaid: { variant: 'red', label: 'Unpaid' },
    paid: { variant: 'green', label: 'Paid' },
    partially_paid: { variant: 'yellow', label: 'Partially Paid' },
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * 20;
    return rows.slice(start, start + 20);
  }, [rows, page]);

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / 20);

  function formatCurrency(amount: number): string {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function handleClearBonuses(employeeId: string) {
    const adj = adjustmentTotals.get(employeeId);
    if (!adj || adj.bonuses.length === 0) return;
    if (!confirm(`Clear all ${adj.bonuses.length} bonus(es) for this employee?`)) return;
    setDeleteError(null);
    for (const bonus of adj.bonuses) {
      try {
        await deleteAdjustment.mutateAsync(bonus.id);
      } catch (err) {
        setDeleteError(err instanceof AppError ? err.message : 'Failed to delete bonus');
      }
    }
  }

  async function handleClearCuts(employeeId: string) {
    const adj = adjustmentTotals.get(employeeId);
    if (!adj || adj.cuts.length === 0) return;
    if (!confirm(`Clear all ${adj.cuts.length} cut(s) for this employee?`)) return;
    setDeleteError(null);
    for (const cut of adj.cuts) {
      try {
        await deleteAdjustment.mutateAsync(cut.id);
      } catch (err) {
        setDeleteError(err instanceof AppError ? err.message : 'Failed to delete cut');
      }
    }
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  }

  const isLoadingAll = isLoading || !employeesData;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <select
          value={monthFilter}
          onChange={(e) => { setMonthFilter(Number(e.target.value)); setPage(1); }}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {MONTHS.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>{name}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(Number(e.target.value)); setPage(1); }}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
        </select>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {isLoadingAll ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load salaries
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          No employees found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Base Salary</th>
                  <th className="px-4 py-3 text-right">Bonus</th>
                  <th className="px-4 py-3 text-right">Cut</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-right">Total Paid</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Advances</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((row) => {
                  const salary = row.salary;

                  if (!salary) {
                    const empBonuses = adjustmentTotals.get(row.employeeId);
                    const totalBonus = empBonuses?.totalBonus ?? 0;
                    const totalCut = empBonuses?.totalCut ?? 0;
                    const netSalary = row.employeeBaseSalary + totalBonus - totalCut;

                    return (
                      <tr key={row.employeeId} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="text-slate-800 font-medium">{row.employeeName}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {formatCurrency(row.employeeBaseSalary)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                          {totalBonus > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {formatCurrency(totalBonus)}
                              <PermissionGate module="expenses" action="delete">
                                <button
                                  onClick={() => handleClearBonuses(row.employeeId)}
                                  className="rounded p-0.5 text-green-400 transition-colors hover:bg-green-100 hover:text-red-500"
                                  title="Clear bonuses"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </PermissionGate>
                            </span>
                          ) : <span className="text-xs text-slate-400">&mdash;</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">
                          {totalCut > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {formatCurrency(totalCut)}
                              <PermissionGate module="expenses" action="delete">
                                <button
                                  onClick={() => handleClearCuts(row.employeeId)}
                                  className="rounded p-0.5 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
                                  title="Clear cuts"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </PermissionGate>
                            </span>
                          ) : <span className="text-xs text-slate-400">&mdash;</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {formatCurrency(netSalary)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                          <span className="text-xs">—</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                          <span className="text-xs">—</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          <span className="text-xs">—</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="red">Unpaid</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <PermissionGate module="expenses" action="create">
                              <button
                                onClick={() => onPay(row.employeeId)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                title="Pay salary"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                            {onAddBonus && (
                              <PermissionGate module="expenses" action="create">
                                <button
                                  onClick={() => onAddBonus(row.employeeId, monthFilter, yearFilter)}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                  title="Add bonus"
                                >
                                  <Gift className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                            )}
                            {onAddCut && (
                              <PermissionGate module="expenses" action="create">
                                <button
                                  onClick={() => onAddCut(row.employeeId, monthFilter, yearFilter)}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                                  title="Add salary cut"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                            )}
                            </div>
                        </td>
                      </tr>
                    );
                  }

                  const empBonuses = adjustmentTotals.get(salary.employeeId._id);
                  const totalBonus = empBonuses?.totalBonus ?? 0;
                  const totalCut = empBonuses?.totalCut ?? 0;
                  const netSalary = salary.baseSalary + totalBonus - totalCut;

                  return (
                    <tr key={salary.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{salary.employeeId.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatCurrency(salary.baseSalary)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {totalBonus > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            {formatCurrency(totalBonus)}
                            <PermissionGate module="expenses" action="delete">
                              <button
                                onClick={() => handleClearBonuses(salary.employeeId._id)}
                                className="rounded p-0.5 text-green-400 transition-colors hover:bg-green-100 hover:text-red-500"
                                title="Clear bonuses"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </PermissionGate>
                          </span>
                        ) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">
                        {totalCut > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            {formatCurrency(totalCut)}
                            <PermissionGate module="expenses" action="delete">
                              <button
                                onClick={() => handleClearCuts(salary.employeeId._id)}
                                className="rounded p-0.5 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
                                title="Clear cuts"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </PermissionGate>
                          </span>
                        ) : <span className="text-xs text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatCurrency(netSalary)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {formatCurrency(salary.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        <span className={salary.remainingBalance > 0 ? 'text-amber-600' : 'text-slate-600'}>
                          {formatCurrency(salary.remainingBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {salary.advances.length}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={paymentBadge[getPaymentState(row)].variant}>
                          {paymentBadge[getPaymentState(row)].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewDetail(salary)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {getPaymentState(row) === 'unpaid' && (
                            <PermissionGate module="expenses" action="create">
                              <button
                                onClick={() => onPay(salary.employeeId._id)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                title="Pay salary"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          )}
                          {getPaymentState(row) !== 'paid' && (
                            <PermissionGate module="expenses" action="edit">
                              <button
                                onClick={() => onAddAdvance(salary)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                title="Add advance"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          )}
                          {onAddBonus && (
                            <PermissionGate module="expenses" action="create">
                              <button
                                onClick={() => onAddBonus(salary.employeeId._id, salary.month, salary.year)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                title="Add bonus"
                              >
                                <Gift className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          )}
                          {onAddCut && (
                            <PermissionGate module="expenses" action="create">
                              <button
                                onClick={() => onAddCut(salary.employeeId._id, salary.month, salary.year)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                                title="Add salary cut"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          )}
                          <PermissionGate module="expenses" action="delete">
                              <button
                                onClick={() => onDelete(salary)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                                title="Delete salary"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {Math.min((page - 1) * 20 + 1, totalRows)}&ndash;{Math.min(page * 20, totalRows)} of{' '}
            {totalRows}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
