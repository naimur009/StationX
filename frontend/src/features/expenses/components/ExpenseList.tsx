'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit3, Trash2, Wallet, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExpensesList, useExpenseReferenceData, type ExpenseResponse } from '../api';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import PermissionGate from '@/components/shared/PermissionGate';

interface ExpenseListProps {
  onEdit: (expense: ExpenseResponse) => void;
  onDelete: (expense: ExpenseResponse) => void;
}

export default function ExpenseList({ onEdit, onDelete }: ExpenseListProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [debouncedCategory, setDebouncedCategory] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'cash' | 'card' | 'bkash' | 'nagad' | ''>('');
  const [paidByFilter, setPaidByFilter] = useState('');
  const mountedRef = useRef(true);

  const { filter: dateFilter, setRange, setCustomRange } = useDateRangeFilter('today');

  const { data: refData, isError: refError } = useExpenseReferenceData();

  const vendors = refData?.data.vendors ?? [];
  const employees = refData?.data.employees ?? [];

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setDebouncedCategory(categoryFilter);
      }
    }, 300);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [categoryFilter]);

  const queryParams = {
    page,
    limit: 20,
    range: dateFilter.range,
    from: dateFilter.from,
    to: dateFilter.to,
    category: debouncedCategory || undefined,
    vendorId: vendorFilter || undefined,
    paymentMethod: paymentFilter || undefined,
    paidBy: paidByFilter || undefined,
  };

  const { data, isLoading, isError } = useExpensesList(queryParams);

  useEffect(() => {
    setPage(1);
  }, [debouncedCategory, vendorFilter, paymentFilter, paidByFilter, dateFilter]);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || (data && newPage > Math.ceil(data.meta.total / data.meta.limit))) return;
    setPage(newPage);
  }

  function goToDetail(expense: ExpenseResponse) {
    router.push(`/expenses/${expense.id}`);
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  function clearFilters() {
    setCategoryFilter('');
    setVendorFilter('');
    setPaymentFilter('');
    setPaidByFilter('');
    setRange('today');
  }

  const hasFilters = debouncedCategory || vendorFilter || paymentFilter || paidByFilter || dateFilter.range !== 'today';

  function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const local = new Date(y, m - 1, d);
    return local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max)}\u2026` : text;
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    bkash: 'bKash',
    nagad: 'Nagad',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <DateRangeFilter
          value={dateFilter.range}
          onChange={setRange}
          onCustomRange={setCustomRange}
        />

        {refError && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            Could not load vendor and staff lists for filters.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Search Category</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filter by category..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Vendor</label>
            <Select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Payment Method</label>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'cash' | 'card' | 'bkash' | 'nagad' | '')}
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Paid By</label>
            <Select
              value={paidByFilter}
              onChange={(e) => setPaidByFilter(e.target.value)}
            >
              <option value="">All Staff</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load expenses
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
          <Wallet className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No expenses found. Record your first expense to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {data?.data.map((expense) => (
              <div
                key={expense.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  onClick={() => goToDetail(expense)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <Wallet className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{expense.description}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{formatDate(expense.date)}</p>
                      </div>
                    </div>
                    <Badge variant="blue" className="shrink-0">{expense.category}</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {expense.paidTo}
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                </button>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    {paymentMethodLabels[expense.paymentMethod] ?? expense.paymentMethod}
                    <span className="text-slate-300">&middot;</span>
                    {expense.paidBy?.name ?? 'Unknown'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToDetail(expense)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                      title="View expense"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <PermissionGate module="expenses" action="edit">
                      <button
                        onClick={() => onEdit(expense)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                        title="Edit expense"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </PermissionGate>
                    <PermissionGate module="expenses" action="delete">
                      <button
                        onClick={() => onDelete(expense)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table layout — columns reduce progressively on smaller screens */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 xl:px-4">Date</th>
                  <th className="px-3 py-3 xl:px-4">Description</th>
                  <th className="hidden px-3 py-3 xl:table-cell xl:px-4">Vendor</th>
                  <th className="px-3 py-3 text-right xl:px-4">Amount</th>
                  <th className="hidden px-3 py-3 xl:table-cell xl:px-4">Paid By</th>
                  <th className="px-3 py-3 text-right xl:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => goToDetail(expense)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600 xl:px-4">
                      {formatDate(expense.date)}
                    </td>
                    <td className="max-w-[160px] px-3 py-3 text-slate-700 lg:max-w-[200px] xl:max-w-[240px] xl:px-4">
                      <span title={expense.description}>
                        {truncate(expense.description, 60)}
                      </span>
                    </td>
                    <td className="hidden max-w-[150px] truncate px-3 py-3 text-slate-600 xl:table-cell xl:px-4">
                      {expense.vendorId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/vendors/${expense.vendorId!._id}`);
                          }}
                          className="text-primary hover:underline"
                        >
                          {expense.vendorId.name}
                        </button>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900 xl:px-4">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 xl:table-cell xl:px-4">
                      {expense.paidBy?.name ?? 'Unknown'}
                    </td>
                    <td className="px-3 py-3 xl:px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => goToDetail(expense)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                          title="View expense"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <PermissionGate module="expenses" action="edit">
                          <button
                            onClick={() => onEdit(expense)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                            title="Edit expense"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate module="expenses" action="delete">
                          <button
                            onClick={() => onDelete(expense)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {data && data.meta.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{Math.min((page - 1) * data.meta.limit + 1, data.meta.total)}&ndash;{Math.min(page * data.meta.limit, data.meta.total)}</span> of{' '}
            <span className="font-medium text-slate-700">{data.meta.total}</span> entries
          </span>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="min-w-[3.5rem] text-center text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}