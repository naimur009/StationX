'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, Phone, Mail, MapPin, ShoppingBag, Trash2 } from 'lucide-react';
import { useCustomersList, type CustomerResponse } from '../api';
import { Button } from '@/components/ui/button';

interface CustomerListProps {
  onEdit: (customer: CustomerResponse) => void;
  onDelete: (customer: CustomerResponse) => void;
  onCreate?: () => void;
}

export default function CustomerList({ onEdit, onDelete, onCreate }: CustomerListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
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

  const { data, isLoading, isError } = useCustomersList({
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 font-medium underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Loading / Error / Empty */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          Loading customers...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load customers
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
          <p className="text-sm text-slate-400">No customers yet — create one to get started</p>
          {onCreate && (
            <Button variant="primary" size="sm" className="mt-4" onClick={onCreate}>
              Create Customer
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-3 md:hidden">
            {data?.data.map((customer) => (
              <div
                key={customer.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{customer.name}</p>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {customer.email}
                        </span>
                      )}
                      {customer.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {customer.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3 shrink-0" />
                        {customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onEdit(customer)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    title="Edit customer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <Button variant="destructive" size="xs" onClick={() => onDelete(customer)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Table layout */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="hidden sm:table-cell px-5 py-3.5">Email</th>
                  <th className="hidden lg:table-cell px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5 text-center">Orders</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((customer) => (
                  <tr
                    key={customer.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="max-w-[200px] truncate px-5 py-3.5 font-medium text-slate-800">
                      {customer.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{customer.phone}</td>
                    <td className="hidden sm:table-cell max-w-[200px] truncate px-5 py-3.5 text-slate-600">
                      {customer.email || '—'}
                    </td>
                    <td className="hidden lg:table-cell max-w-[250px] truncate px-5 py-3.5 text-slate-600">
                      {customer.address || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {customer.orderCount}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(customer)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          title="Edit customer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <Button variant="destructive" size="xs" onClick={() => onDelete(customer)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </Button>
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
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
