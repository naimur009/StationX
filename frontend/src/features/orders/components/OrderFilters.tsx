'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import type { OrdersFilterFormData } from '../schema';

interface OrderFiltersProps {
  onFilter: (filters: OrdersFilterFormData) => void;
}

export default function OrderFilters({ onFilter }: OrderFiltersProps) {
  const [status, setStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const { filter: dateFilter, setRange, setCustomRange } = useDateRangeFilter('today');

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilter({
        status: status === 'all' ? undefined : (status as OrdersFilterFormData['status']),
        paymentStatus: paymentStatus === 'all' ? undefined : (paymentStatus as OrdersFilterFormData['paymentStatus']),
        range: dateFilter.range,
        from: dateFilter.from,
        to: dateFilter.to,
        search: search || undefined,
        customerPhone: customerPhone || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [status, paymentStatus, dateFilter, search, customerPhone, onFilter]);

  const clearFilters = () => {
    setStatus('all');
    setPaymentStatus('all');
    setSearch('');
    setCustomerPhone('');
    setRange('today');
  };

  const hasFilters = status !== 'all' || paymentStatus !== 'all' || search || customerPhone;

  return (
    <div className="space-y-3">
      <DateRangeFilter
        value={dateFilter.range}
        onChange={setRange}
        onCustomRange={setCustomRange}
      />
      <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">Payment</label>
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-slate-500">Search Order</label>
        <Input
          placeholder="Order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-slate-500">Customer Phone</label>
        <Input
          placeholder="Search by phone..."
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          inputMode="tel"
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
        >
          Clear filters
        </button>
      )}
      </div>
    </div>
  );
}
