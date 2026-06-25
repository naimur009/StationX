'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, ImageOff } from 'lucide-react';
import { useProductList, useUpdateProduct, type ProductResponse } from '../api';
import { useCategoriesList } from '@/features/categories/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface ProductListProps {
  onEdit: (product: ProductResponse) => void;
  onDelete: (product: ProductResponse) => void;
  onPermanentDelete: (product: ProductResponse) => void;
}

export default function ProductList({ onEdit, onDelete, onPermanentDelete }: ProductListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const updateProduct = useUpdateProduct();
  const { data: categoriesData } = useCategoriesList({ isActive: 'true', limit: 100 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const isActiveParam = statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'true' : 'false');

  const { data, isLoading, isError, refetch } = useProductList({
    page,
    limit: 20,
    isActive: isActiveParam,
    categoryId: categoryFilter || undefined,
    search: debouncedSearch || undefined,
  });

  useEffect(() => {
    setPage(1);
    setError(null);
  }, [statusFilter, categoryFilter, debouncedSearch]);

  async function handleReactivate(product: ProductResponse) {
    if (updateProduct.isPending) return;
    try {
      await updateProduct.mutateAsync({ id: product.id, isActive: true });
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to reactivate product');
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
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
          <button className="ml-2 font-medium underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
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
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {categoriesData?.data.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

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

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-400 shadow-sm">
          Loading products...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-sm shadow-sm">
          <span className="text-red-500">Failed to load products</span>
          <Button variant="primary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-400 shadow-sm">
          No products found — create one to get started
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.data.map((product) => (
            <div
              key={product.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
                !product.isActive ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => onEdit(product)}
                className="absolute right-2 top-2 z-10 rounded-lg bg-white/80 p-1.5 text-slate-400 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-white hover:text-blue-600 group-hover:opacity-100"
                title="Edit product"
              >
                <Edit3 className="h-4 w-4" />
              </button>

              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {product.image ? (
                  <img
                    src={product.image.url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-10 w-10 text-slate-300" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-800">
                    {product.name}
                  </h3>
                  {product.isActive ? (
                    <Badge variant="green">Active</Badge>
                  ) : (
                    <Badge variant="slate">Inactive</Badge>
                  )}
                </div>

                <p className="mb-3 text-lg font-bold text-slate-900">
                  TK {product.price.toFixed(2)}
                </p>

                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    {product.categoryName || 'Uncategorized'}
                  </span>
                </div>

                <div className="mt-auto flex gap-2">
                  {product.isActive ? (
                    <Button
                      variant="warning"
                      size="xs"
                      className="w-full"
                      onClick={() => onDelete(product)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="xs"
                        className="flex-1"
                        onClick={() => handleReactivate(product)}
                        disabled={updateProduct.isPending}
                      >
                        Reactivate
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => onPermanentDelete(product)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
