'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, ImageOff, Trash2 } from 'lucide-react';
import { useProductList, type ProductResponse } from '../api';
import { useCategoriesList } from '@/features/categories/api';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

interface ProductListProps {
  onEdit: (product: ProductResponse) => void;
  onDelete: (product: ProductResponse) => void;
}

export default function ProductList({ onEdit, onDelete }: ProductListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data: categoriesData } = useCategoriesList({ limit: 100 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useProductList({
    page,
    limit: 20,
    categoryId: categoryFilter || undefined,
    search: debouncedSearch || undefined,
  });

  useEffect(() => {
    setPage(1);
    setError(null);
  }, [categoryFilter, debouncedSearch]);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || (data && newPage > Math.ceil(data.meta.total / data.meta.limit))) return;
    setPage(newPage);
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
          <button className="ml-2 font-medium underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-auto rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {categoriesData?.data.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[3/2] w-full rounded-t-2xl bg-slate-200" />
              <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
                <div className="h-9 w-full rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-12 sm:py-20 text-sm shadow-sm">
          <span className="text-red-500">Failed to load products</span>
          <Button variant="primary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 sm:py-20 text-sm text-slate-400 shadow-sm">
          No products found — create one to get started
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data?.data.map((product) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
                {product.image ? (
                  <img
                    src={product.image.url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-9 w-9 sm:h-10 sm:w-10 text-slate-300" />
                  </div>
                )}
                <button
                  onClick={() => onEdit(product)}
                  className="absolute right-2 top-2 z-10 rounded-lg bg-white/90 p-2 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-blue-600"
                  title="Edit product"
                  aria-label="Edit product"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <h3 className="line-clamp-1 text-sm font-medium text-slate-800 break-words">
                  {product.name}
                </h3>

                <p className="mt-1 text-sm sm:text-base font-semibold text-blue-600">
                  {formatCurrency(product.price)}
                </p>

                <span className="mt-1 text-xs text-slate-500 truncate">
                  {product.categoryName || 'Uncategorized'}
                </span>

                <div className="mt-auto pt-3 flex flex-col xs:flex-row gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => onDelete(product)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="text-xs xs:text-sm">
            <span className="hidden xs:inline">Showing </span>
            {Math.min((page - 1) * data.meta.limit + 1, data.meta.total)}&ndash;{Math.min(page * data.meta.limit, data.meta.total)}{' '}
            <span className="hidden xs:inline">of </span>
            {data.meta.total}
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-2 sm:p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-xs sm:text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-2 sm:p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
