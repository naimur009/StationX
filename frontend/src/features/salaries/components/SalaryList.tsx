'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Trash2,
  DollarSign,
  Plus,
  Gift,
  Minus,
  CalendarDays,
} from 'lucide-react';
import { useSalariesList, useAdjustmentsList, type SalaryResponse } from '../api';
import { useEmployeesList } from '@/features/employees/api';
import { usePermission } from '@/hooks/usePermission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SalaryListProps {
  onAddAdvance: (salary: SalaryResponse) => void;
  onViewDetail: (salary: SalaryResponse) => void;
  onDelete: (salary: SalaryResponse) => void;
  onAddPayment: (info: {
    employeeId: string;
    employeeName: string;
    baseSalary: number;
    month: number;
    year: number;
  }) => void;
  onAddBonus?: (employeeId: string, month: number, year: number) => void;
  onAddCut?: (employeeId: string, month: number, year: number) => void;
}

interface EmployeeRow {
  employeeId: string;
  employeeName: string;
  employeeBaseSalary: number;
  salary: SalaryResponse | null;
}

type PaymentState = 'unpaid' | 'paid' | 'partially_paid';

const PAYMENT_BADGE: Record<PaymentState, { variant: 'green' | 'yellow' | 'red' | 'slate'; label: string }> = {
  unpaid: { variant: 'red', label: 'Unpaid' },
  paid: { variant: 'green', label: 'Paid' },
  partially_paid: { variant: 'yellow', label: 'Partially Paid' },
};

const selectClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring';

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPaymentState(row: EmployeeRow): PaymentState {
  const salary = row.salary;
  if (!salary || salary.totalPaid === 0) return 'unpaid';
  if (salary.totalPaid >= salary.baseSalary) return 'paid';
  return 'partially_paid';
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

interface RowActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
}

function RowActionMenu({ items }: { items: RowActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function toggle() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuHeight = Math.min(items.length * 36 + 12, 220);
      setOpenUp(window.innerHeight - rect.bottom < menuHeight);
    }
    setOpen((v) => !v);
  }

  if (items.length === 0) return <span className="text-xs text-slate-300">&mdash;</span>;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        title="Actions"
        aria-label="Row actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className={`absolute right-0 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-[dropdown-in_120ms_ease-out] ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalaryList({ onAddAdvance, onViewDetail, onDelete, onAddPayment, onAddBonus, onAddCut }: SalaryListProps) {
  const now = useMemo(() => new Date(), []);
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
  });

  const adjustmentTotals = useMemo(() => {
    const map = new Map<string, { totalBonus: number; totalCut: number }>();
    if (adjustmentsData?.data) {
      for (const adj of adjustmentsData.data) {
        const current = map.get(adj.employeeId) ?? { totalBonus: 0, totalCut: 0 };
        if (adj.type === 'bonus') current.totalBonus += adj.amount;
        else current.totalCut += adj.amount;
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

  const pagedRows = useMemo(() => {
    const start = (page - 1) * 20;
    return rows.slice(start, start + 20);
  }, [rows, page]);

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / 20);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  }

  const isLoadingAll = isLoading || !employeesData;

  const canCreate = usePermission('salary', 'create');
  const canEdit = usePermission('salary', 'edit');
  const canDelete = usePermission('salary', 'delete');

  function buildMenuItems(row: EmployeeRow): RowActionItem[] {
    const salary = row.salary;
    const state = getPaymentState(row);
    const month = salary?.month ?? monthFilter;
    const year = salary?.year ?? yearFilter;
    const items: RowActionItem[] = [];

    if (salary) {
      items.push({
        label: 'View Details',
        icon: Eye,
        onClick: () => onViewDetail(salary),
      });
    }

    if (!salary && canCreate) {
      items.push({
        label: 'Payment',
        icon: DollarSign,
        onClick: () =>
          onAddPayment({
            employeeId: row.employeeId,
            employeeName: row.employeeName,
            baseSalary: row.employeeBaseSalary,
            month,
            year,
          }),
      });
    }
    if (salary && state !== 'paid' && canEdit) {
      items.push({
        label: 'Payments',
        icon: Plus,
        onClick: () => onAddAdvance(salary),
      });
    }
    if (onAddBonus && canCreate) {
      items.push({
        label: 'Add Bonus',
        icon: Gift,
        onClick: () => onAddBonus(row.employeeId, month, year),
      });
    }
    if (onAddCut && canCreate) {
      items.push({
        label: 'Add Deduction',
        icon: Minus,
        onClick: () => onAddCut(row.employeeId, month, year),
      });
    }
    if (salary && canDelete) {
      items.push({
        label: 'Delete',
        icon: Trash2,
        onClick: () => onDelete(salary),
        danger: true,
      });
    }

    return items;
  }

  const selectedMonthLabel = MONTHS[monthFilter - 1];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-800">{selectedMonthLabel} {yearFilter}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
          <select value={monthFilter} onChange={(e) => { setMonthFilter(Number(e.target.value)); setPage(1); }} className={selectClass}>
            {MONTHS.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select value={yearFilter} onChange={(e) => { setYearFilter(Number(e.target.value)); setPage(1); }} className={selectClass}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }} className={selectClass}>
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>
      </div>

      {/* Loading / error / empty states */}
      {isLoadingAll && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      )}

      {!isLoadingAll && isError && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load salaries
        </div>
      )}

      {!isLoadingAll && !isError && rows.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          No employees found.
        </div>
      )}

      {!isLoadingAll && !isError && rows.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full border-collapse text-left text-sm md:text-xs lg:text-sm">
              <thead className="bg-slate-50 [&_tr>th:first-child]:rounded-tl-2xl [&_tr>th:last-child]:rounded-tr-2xl">
                <tr className="text-xs font-semibold uppercase text-slate-500">
                  <th className="border-r border-slate-200 px-4 py-3.5">Employee</th>
                  <th className="hidden border-r border-slate-200 px-4 py-3.5 lg:table-cell">Base Salary</th>
                  <th className="border-r border-slate-200 px-4 py-3.5">Paid</th>
                  <th className="border-r border-slate-200 px-4 py-3.5">Remaining</th>
                  <th className="border-r border-slate-200 px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&_tr:last-child>td:first-child]:rounded-bl-2xl [&_tr:last-child>td:last-child]:rounded-br-2xl">
                {pagedRows.map((row) => {
                  const salary = row.salary;
                  const state = getPaymentState(row);
                  const badge = PAYMENT_BADGE[state];
                  const adj = adjustmentTotals.get(row.employeeId);
                  const base = salary?.baseSalary ?? row.employeeBaseSalary;
                  const net = base + (adj?.totalBonus ?? 0) - (adj?.totalCut ?? 0);
                  const remaining = salary ? salary.remainingBalance : net;

                  return (
                    <tr key={row.employeeId} className="transition-colors hover:bg-slate-50">
                      <td className="border-r border-slate-200 px-4 py-3.5">
                        <div className="flex items-center justify-start gap-1.5">
                          <span className="font-medium text-slate-800">{row.employeeName}</span>
                          {(adj?.totalCut ?? 0) > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-500" title={`Deduction ${formatCurrency(adj?.totalCut ?? 0)}`}>
                              <Minus className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden border-r border-slate-200 px-4 py-3.5 font-semibold text-slate-500 whitespace-nowrap lg:table-cell">
                        {formatCurrency(base)}
                      </td>
                      <td className="border-r border-slate-200 px-4 py-3.5 font-semibold text-green-600 whitespace-nowrap">
                        {salary ? formatCurrency(salary.totalPaid) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                      </td>
                      <td className="border-r border-slate-200 px-4 py-3.5 font-semibold whitespace-nowrap">
                        <span className={remaining > 0 ? 'text-amber-600' : 'text-slate-600'}>
                          {salary ? formatCurrency(remaining) : <span className="text-xs font-normal text-slate-400">&mdash;</span>}
                        </span>
                      </td>
                      <td className="border-r border-slate-200 px-4 py-3.5">
                        <Badge variant={badge.variant} className="md:px-2 md:py-0 md:text-[10px] lg:px-2.5 lg:py-0.5 lg:text-xs">
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <RowActionMenu items={buildMenuItems(row)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {pagedRows.map((row) => {
              const salary = row.salary;
              const state = getPaymentState(row);
              const badge = PAYMENT_BADGE[state];
              const adj = adjustmentTotals.get(row.employeeId);
              const base = salary?.baseSalary ?? row.employeeBaseSalary;
              const net = base + (adj?.totalBonus ?? 0) - (adj?.totalCut ?? 0);
              const remaining = salary ? salary.remainingBalance : net;

              return (
                <div key={row.employeeId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {initialsOf(row.employeeName)}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-medium text-slate-800">{row.employeeName}</span>
                        {(adj?.totalCut ?? 0) > 0 && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500" title={`Deduction ${formatCurrency(adj?.totalCut ?? 0)}`}>
                            <Minus className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Base Salary</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(base)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                      <span className="text-xs text-slate-500">Net Salary</span>
                      <span className="font-bold text-slate-800">{formatCurrency(net)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-xs text-slate-500">Paid</span>
                      <span className="font-semibold text-green-600">{salary ? formatCurrency(salary.totalPaid) : formatCurrency(0)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Remaining</span>
                      <span className={`font-semibold ${remaining > 0 ? 'text-amber-600' : 'text-slate-600'}`}>{salary ? formatCurrency(remaining) : formatCurrency(net)}</span>
                    </div>
                    {(adj?.totalBonus ?? 0) > 0 || (adj?.totalCut ?? 0) > 0 ? (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-xs text-slate-500">Bonus / Deduction</span>
                        <span className="text-xs font-semibold">
                          {(adj?.totalBonus ?? 0) > 0 && <span className="text-green-600">+{formatCurrency(adj?.totalBonus ?? 0)}</span>}
                          {(adj?.totalBonus ?? 0) > 0 && (adj?.totalCut ?? 0) > 0 && <span className="text-slate-400"> / </span>}
                          {(adj?.totalCut ?? 0) > 0 && <span className="text-red-500">-{formatCurrency(adj?.totalCut ?? 0)}</span>}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    {salary ? (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewDetail(salary)}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        View Details
                      </Button>
                    ) : (
                      <PermissionGate module="salary" action="create">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            onAddPayment({
                              employeeId: row.employeeId,
                              employeeName: row.employeeName,
                              baseSalary: row.employeeBaseSalary,
                              month: monthFilter,
                              year: yearFilter,
                            })
                          }
                        >
                          <DollarSign className="mr-1.5 h-4 w-4" />
                          Payment
                        </Button>
                      </PermissionGate>
                    )}
                    <RowActionMenu items={buildMenuItems(row)} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
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
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
