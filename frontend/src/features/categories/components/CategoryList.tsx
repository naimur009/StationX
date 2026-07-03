'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { useCategoriesList, useUpdateCategory, type CategoryResponse } from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface CategoryListProps {
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
  onPermanentDelete: (category: CategoryResponse) => void;
}

export default function CategoryList({ onEdit, onDelete, onPermanentDelete }: CategoryListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const updateCategory = useUpdateCategory();

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

  const isActiveParam = statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'true' : 'false');

  const { data, isLoading, isError } = useCategoriesList({
    page,
    limit: 20,
    isActive: isActiveParam,
    search: debouncedSearch || undefined,
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  async function handleReactivate(category: CategoryResponse) {
    try {
      await updateCategory.mutateAsync({ id: category.id, isActive: true });
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to reactivate category');
      }
    }
  }

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

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      {/* Loading / Error / Empty (shared) */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-red-500 shadow-sm">
          Failed to load categories
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          No categories yet — create one to get started
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-3 md:hidden">
            {data?.data.map((category) => (
              <div
                key={category.id}
                className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                  !category.isActive ? 'opacity-60' : ''
                }`}
              >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{category.name}</p>
                      <p className="text-sm text-slate-500">{category.productCount} product{category.productCount !== 1 ? 's' : ''} &middot; Tax: {category.taxRate}%</p>
                    </div>
                  <div className="shrink-0">
                    {category.isActive ? (
                      <span className="inline-block size-1.5 rounded-full bg-green-500" title="Active" />
                    ) : (
                      <Badge variant="slate">Deactivated</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onEdit(category)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                    title="Edit category"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {category.isActive ? (
                    <Button variant="warning" size="xs" onClick={() => onDelete(category)}>
                      Deactivate
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => handleReactivate(category)}
                        disabled={updateCategory.isPending}
                      >
                        Reactivate
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => onPermanentDelete(category)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
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
                    <th className="hidden sm:table-cell px-4 py-3">Tax Rate</th>
                    <th className="hidden sm:table-cell px-4 py-3">Products</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((category) => (
                  <tr
                    key={category.id}
                    className={`transition-colors hover:bg-slate-50 ${
                      !category.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="max-w-[300px] truncate px-4 py-3 font-medium text-slate-800">
                      {category.name}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-slate-600">
                      {category.taxRate}%
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-slate-600">
                      {category.productCount}
                    </td>
                    <td className="px-4 py-3">
                      {category.isActive ? (
                        <span
                          className="inline-block size-1.5 rounded-full bg-green-500"
                          title="Active"
                        />
                      ) : (
                        <Badge variant="slate">Deactivated</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(category)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          title="Edit category"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {category.isActive ? (
                          <Button variant="warning" size="xs" onClick={() => onDelete(category)}>
                            Deactivate
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleReactivate(category)}
                              disabled={updateCategory.isPending}
                            >
                              Reactivate
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => onPermanentDelete(category)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
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
