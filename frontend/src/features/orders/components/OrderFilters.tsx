'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
    <div className="space-y-4">
      <DateRangeFilter
        value={dateFilter.range}
        onChange={setRange}
        onCustomRange={setCustomRange}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Status</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Payment</label>
          <Select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Search Order</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Customer Phone</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by phone..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              inputMode="tel"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}