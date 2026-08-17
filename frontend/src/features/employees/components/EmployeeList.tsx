'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, Trash2, DollarSign, UserRound, X } from 'lucide-react';
import { useEmployeesList, type EmployeeResponse } from '../api';
import { Input } from '@/components/ui/input';
import PermissionGate from '@/components/shared/PermissionGate';
import { formatCurrency } from '@/lib/format';

interface EmployeeListProps {
  onEdit: (employee: EmployeeResponse) => void;
  onDelete: (employee: EmployeeResponse) => void;
}

export default function EmployeeList({ onEdit, onDelete }: EmployeeListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setDebouncedSearch(search);
      }
    }, 300);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [search]);

  const { data, isLoading, isError } = useEmployeesList({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || (data && newPage > Math.ceil(data.meta.total / data.meta.limit))) return;
    setPage(newPage);
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  function clearSearch() {
    setSearch('');
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear search
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
          Failed to load employees
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
          <UserRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No employees yet — add one to get started</p>
        </div>
      ) : (
        <>
          {/* Mobile & tablet card layout */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {data?.data.map((employee) => (
              <div
                key={employee.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{employee.name}</p>
                        {employee.phone && (
                          <p className="truncate text-xs text-slate-400">{employee.phone}</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      {formatCurrency(employee.baseSalary)}
                    </span>
                  </div>
                  {employee.address && (
                    <p className="mt-2 truncate text-xs text-slate-500">{employee.address}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                  <PermissionGate module="employees" action="edit">
                    <button
                      onClick={() => onEdit(employee)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                      title="Edit employee"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate module="employees" action="delete">
                    <button
                      onClick={() => onDelete(employee)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                      title="Delete employee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>

          {/* Table layout — columns reduce progressively on smaller screens */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 xl:px-4">Name</th>
                  <th className="px-3 py-3 xl:px-4">Phone</th>
                  <th className="hidden px-3 py-3 xl:table-cell xl:px-4">Address</th>
                  <th className="px-3 py-3 text-right xl:px-4">Base Salary</th>
                  <th className="px-3 py-3 text-right xl:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((employee) => (
                  <tr key={employee.id} className="transition-colors hover:bg-slate-50">
                    <td className="max-w-[180px] truncate px-3 py-3 font-medium text-slate-800 xl:max-w-[240px] xl:px-4">
                      {employee.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600 xl:px-4">
                      {employee.phone}
                    </td>
                    <td className="hidden max-w-[200px] truncate px-3 py-3 text-slate-600 xl:table-cell xl:px-4">
                      {employee.address || '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800 xl:px-4">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        {formatCurrency(employee.baseSalary)}
                      </span>
                    </td>
                    <td className="px-3 py-3 xl:px-4">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGate module="employees" action="edit">
                          <button
                            onClick={() => onEdit(employee)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                            title="Edit employee"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate module="employees" action="delete">
                          <button
                            onClick={() => onDelete(employee)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                            title="Delete employee"
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