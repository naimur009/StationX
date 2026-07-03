'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVendorsList, type VendorResponse } from '../api';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';

interface VendorListProps {
  onEdit: (vendor: VendorResponse) => void;
  onDelete: (vendor: VendorResponse) => void;
}

export default function VendorList({ onEdit, onDelete }: VendorListProps) {
  const router = useRouter();
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

  const { data, isLoading, isError } = useVendorsList({
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

  function goToDetail(vendor: VendorResponse) {
    router.push(`/vendors/${vendor.id}`);
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load vendors
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          No vendors found. Create your first vendor to get started.
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-3 md:hidden">
            {data?.data.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => goToDetail(vendor)}
                      className="truncate text-left font-medium text-slate-800 hover:text-blue-600"
                    >
                      {vendor.name}
                    </button>
                    {vendor.contactPerson && (
                      <p className="truncate text-sm text-slate-500">{vendor.contactPerson}</p>
                    )}
                  </div>
                </div>
                {vendor.itemsSupplied.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {vendor.itemsSupplied.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {vendor.itemsSupplied.length > 2 && (
                      <span className="text-xs text-slate-400">+{vendor.itemsSupplied.length - 2} more</span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => goToDetail(vendor)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                    title="View vendor"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <PermissionGate module="vendors" action="edit">
                    <button
                      onClick={() => onEdit(vendor)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                      title="Edit vendor"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate module="vendors" action="delete">
                    <Button variant="destructive" size="xs" onClick={() => onDelete(vendor)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
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
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact Person</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Items Supplied</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => goToDetail(vendor)}
                        className="font-medium text-slate-800 hover:text-blue-600"
                      >
                        {vendor.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {vendor.contactPerson || <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {vendor.phone || <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {vendor.email || <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {vendor.itemsSupplied.length > 0 ? (
                          <>
                            {vendor.itemsSupplied.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                              >
                                {tag}
                              </span>
                            ))}
                            {vendor.itemsSupplied.length > 3 && (
                              <span className="text-xs text-slate-400">+{vendor.itemsSupplied.length - 3} more</span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => goToDetail(vendor)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          title="View vendor"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <PermissionGate module="vendors" action="edit">
                          <button
                            onClick={() => onEdit(vendor)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            title="Edit vendor"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate module="vendors" action="delete">
                          <Button variant="destructive" size="xs" onClick={() => onDelete(vendor)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
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
