'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { useCouponList, useToggleCoupon, COUPON_STATUS_CONFIG, type CouponResponse } from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface CouponListProps {
  onEdit: (coupon: CouponResponse) => void;
  onDelete: (coupon: CouponResponse) => void;
}

export default function CouponList({ onEdit, onDelete }: CouponListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('all');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const toggleCoupon = useToggleCoupon();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const isEnabledParam = filterEnabled === 'all' ? undefined : filterEnabled;

  const { data, isLoading, isError, refetch } = useCouponList({
    page,
    limit: 20,
    isEnabled: isEnabledParam,
    search: debouncedSearch || undefined,
    discountType: filterType || undefined,
  });

  useEffect(() => {
    setPage(1);
    setError(null);
  }, [filterEnabled, filterType, debouncedSearch]);

  async function handleToggle(coupon: CouponResponse) {
    if (toggleCoupon.isPending) return;
    try {
      await toggleCoupon.mutateAsync(coupon.id);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to toggle coupon');
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
          <button className="ml-2 font-medium underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-center">
        <div className="relative flex-1 min-w-0 xs:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All Types</option>
          <option value="flat">Flat</option>
          <option value="percentage">Percentage</option>
        </select>

        <select
          value={filterEnabled}
          onChange={(e) => setFilterEnabled(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-2 ring-ring ring-offset-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-400 shadow-sm">
          Loading coupons...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-sm shadow-sm">
          <span className="text-red-500">Failed to load coupons</span>
          <Button variant="primary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-400 shadow-sm">
          No coupons found — create one to get started
        </div>
      ) : (
        <>
          {/* Cards — below md */}
          <div className="grid gap-4 md:hidden">
            {data?.data.map((coupon) => {
              const config = COUPON_STATUS_CONFIG[coupon.status] || COUPON_STATUS_CONFIG.disabled;
              return (
                <div
                  key={coupon.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onEdit(coupon)}
                        className="truncate text-sm font-semibold text-slate-800 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                      >
                        {coupon.code}
                      </button>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {coupon.discountType === 'flat'
                          ? `TK ${coupon.value.toFixed(2)}`
                          : `${coupon.value}%`}
                        <span className="ml-1 text-sm font-normal text-slate-500">
                          {coupon.discountType === 'flat' ? 'off' : 'off'}
                        </span>
                      </div>
                      {coupon.maxDiscountAmount && coupon.discountType === 'percentage' && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          Max discount TK {coupon.maxDiscountAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>

                  <div className="space-y-2 px-5 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Usage</span>
                      <span className="font-medium text-slate-700">
                        {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Valid</span>
                      <span className="font-medium text-slate-700">
                        {new Date(coupon.validFrom).toLocaleDateString()} &ndash; {new Date(coupon.validUntil).toLocaleDateString()}
                      </span>
                    </div>
                    {coupon.minOrderAmount && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Min. order</span>
                        <span className="font-medium text-slate-700">TK {coupon.minOrderAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-5 py-2.5">
                    <button
                      onClick={() => handleToggle(coupon)}
                      disabled={toggleCoupon.isPending}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      title={coupon.isEnabled ? 'Disable' : 'Enable'}
                    >
                      {coupon.isEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(coupon)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(coupon)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table — md+ */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Value</th>
                  <th className="px-5 py-3.5">Usage</th>
                  <th className="px-5 py-3.5">Valid</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((coupon) => {
                  const config = COUPON_STATUS_CONFIG[coupon.status] || COUPON_STATUS_CONFIG.disabled;
                  return (
                    <tr key={coupon.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => onEdit(coupon)}
                          className="font-semibold text-slate-800 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                        >
                          {coupon.code}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {coupon.discountType === 'flat'
                          ? `TK ${coupon.value.toFixed(2)}`
                          : `${coupon.value}%`}
                        {coupon.maxDiscountAmount && coupon.discountType === 'percentage'
                          ? <span className="text-xs text-slate-400"> (max TK {coupon.maxDiscountAmount.toFixed(2)})</span>
                          : ''}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {coupon.usageCount}
                        {coupon.usageLimit ? <span className="text-slate-400"> / {coupon.usageLimit}</span> : ''}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <div>{new Date(coupon.validFrom).toLocaleDateString()}</div>
                        <div>{new Date(coupon.validUntil).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(coupon)}
                            disabled={toggleCoupon.isPending}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            title={coupon.isEnabled ? 'Disable' : 'Enable'}
                          >
                            {coupon.isEnabled ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onEdit(coupon)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDelete(coupon)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.meta.total > 0 && (
        <div className="flex flex-col items-center gap-3 xs:flex-row xs:justify-between text-sm text-slate-500">
          <span className="text-xs xs:text-sm">
            {Math.min((page - 1) * data.meta.limit + 1, data.meta.total)}&ndash;{Math.min(page * data.meta.limit, data.meta.total)} of{' '}
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
