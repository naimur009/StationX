'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit3, Trash2, Building2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVendorsList, type VendorResponse } from '../api';
import { Input } from '@/components/ui/input';
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
            placeholder="Search vendors..."
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
          Failed to load vendors
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No vendors found. Create your first vendor to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile & tablet card layout */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {data?.data.map((vendor) => (
              <div
                key={vendor.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  onClick={() => goToDetail(vendor)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{vendor.name}</p>
                        {vendor.contactPerson && (
                          <p className="truncate text-xs text-slate-400">{vendor.contactPerson}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                    <span className="truncate text-xs text-slate-500">
                      {vendor.phone || vendor.email || 'No contact info'}
                    </span>
                    {vendor.itemsSupplied.length > 0 && (
                      <span className="shrink-0 text-xs text-slate-400">
                        {vendor.itemsSupplied.length} item{vendor.itemsSupplied.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                  <span className="truncate text-xs text-slate-500">
                    {vendor.itemsSupplied.slice(0, 1).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {vendor.itemsSupplied.length > 1 && (
                      <span className="ml-1.5 text-slate-400">+{vendor.itemsSupplied.length - 1} more</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToDetail(vendor)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                      title="View vendor"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <PermissionGate module="vendors" action="edit">
                      <button
                        onClick={() => onEdit(vendor)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                        title="Edit vendor"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </PermissionGate>
                    <PermissionGate module="vendors" action="delete">
                      <button
                        onClick={() => onDelete(vendor)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                        title="Delete vendor"
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
                  <th className="px-3 py-3 xl:px-4">Name</th>
                  <th className="px-3 py-3 xl:px-4">Contact Person</th>
                  <th className="px-3 py-3 xl:px-4">Phone</th>
                  <th className="hidden px-3 py-3 lg:table-cell xl:px-4">Email</th>
                  <th className="hidden px-3 py-3 xl:table-cell xl:px-4">Items Supplied</th>
                  <th className="px-3 py-3 text-right xl:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => goToDetail(vendor)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="max-w-[180px] px-3 py-3 xl:max-w-[240px] xl:px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(vendor);
                        }}
                        className="block w-full truncate font-medium text-slate-800 hover:text-primary"
                      >
                        {vendor.name}
                      </button>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-3 text-slate-600 xl:px-4">
                      {vendor.contactPerson || <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600 xl:px-4">
                      {vendor.phone || <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="hidden max-w-[160px] truncate px-3 py-3 text-slate-600 lg:table-cell xl:max-w-[200px] xl:px-4">
                      {vendor.email || <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="hidden max-w-[220px] px-3 py-3 xl:table-cell xl:px-4">
                      <div className="flex flex-wrap gap-1">
                        {vendor.itemsSupplied.length > 0 ? (
                          <>
                            {vendor.itemsSupplied.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
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
                    <td className="px-3 py-3 xl:px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => goToDetail(vendor)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                          title="View vendor"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <PermissionGate module="vendors" action="edit">
                          <button
                            onClick={() => onEdit(vendor)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                            title="Edit vendor"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate module="vendors" action="delete">
                          <button
                            onClick={() => onDelete(vendor)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                            title="Delete vendor"
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