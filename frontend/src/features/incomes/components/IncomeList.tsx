'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useIncomesList, useIncomeReferenceData, type IncomeResponse } from '../api';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';

interface IncomeListProps {
  onEdit: (income: IncomeResponse) => void;
  onDelete: (income: IncomeResponse) => void;
}

export default function IncomeList({ onEdit, onDelete }: IncomeListProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [debouncedCategory, setDebouncedCategory] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [receivedByFilter, setReceivedByFilter] = useState('');
  const mountedRef = useRef(true);

  const { filter: dateFilter, setRange, setCustomRange, queryString: dateQueryString } = useDateRangeFilter('today');

  const { data: refData, isError: refError } = useIncomeReferenceData();

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
    paymentMethod: paymentFilter || undefined,
    receivedBy: receivedByFilter || undefined,
  };

  const { data, isLoading, isError } = useIncomesList(queryParams);

  useEffect(() => {
    setPage(1);
  }, [debouncedCategory, paymentFilter, receivedByFilter, dateFilter]);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || (data && newPage > Math.ceil(data.meta.total / data.meta.limit))) return;
    setPage(newPage);
  }

  function goToDetail(income: IncomeResponse) {
    router.push(`/incomes/${income.id}`);
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

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
      <div className="flex flex-col gap-3">
        <DateRangeFilter
          value={dateFilter.range}
          onChange={setRange}
          onCustomRange={setCustomRange}
        />

        {refError && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            Could not load staff list for filters.
          </div>
        )}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by category..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>

          <select
            value={receivedByFilter}
            onChange={(e) => setReceivedByFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
          >
            <option value="">All Staff</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load incomes
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          No incomes found. Record your first income entry to get started.
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-3 md:hidden">
            {data?.data.map((income) => (
              <div
                key={income.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-green-600">
                        +{formatCurrency(income.amount)}
                      </span>
                      <Badge variant="blue">{income.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(income.date)}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{income.description}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{income.receivedFrom}</span>
                  <span className="text-slate-300">|</span>
                  <span>{paymentMethodLabels[income.paymentMethod] ?? income.paymentMethod}</span>
                  <span className="text-slate-300">|</span>
                  <span>{income.receivedBy?.name ?? 'Unknown'}</span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => goToDetail(income)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                    title="View income"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <PermissionGate module="incomes" action="edit">
                    <button
                      onClick={() => onEdit(income)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                      title="Edit income"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate module="incomes" action="delete">
                    <button
                      onClick={() => onDelete(income)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                      title="Delete income"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>

          {/* Table layout */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Received From</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Received By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((income) => (
                  <tr
                    key={income.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(income.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px]">
                      <span title={income.description}>
                        {truncate(income.description, 60)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="blue">{income.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {income.receivedFrom}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                      +{formatCurrency(income.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {paymentMethodLabels[income.paymentMethod] ?? income.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {income.receivedBy?.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => goToDetail(income)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                          title="View income"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <PermissionGate module="incomes" action="edit">
                          <button
                            onClick={() => onEdit(income)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                            title="Edit income"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate module="incomes" action="delete">
                          <button
                            onClick={() => onDelete(income)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                            title="Delete income"
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

      {data && data.meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {Math.min((page - 1) * data.meta.limit + 1, data.meta.total)}&ndash;{Math.min(page * data.meta.limit, data.meta.total)} of{' '}
            {data.meta.total}
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
