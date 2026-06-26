'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import type { OrdersFilterFormData } from '../schema';

interface OrderFiltersProps {
  onFilter: (filters: OrdersFilterFormData) => void;
}

export default function OrderFilters({ onFilter }: OrderFiltersProps) {
  const [status, setStatus] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilter({
        status: status === 'all' ? undefined : (status as OrdersFilterFormData['status']),
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
        customerSearch: customerSearch || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [status, from, to, search, customerSearch, onFilter]);

  const clearFilters = () => {
    setStatus('all');
    setFrom('');
    setTo('');
    setSearch('');
    setCustomerSearch('');
  };

  const hasFilters = status !== 'all' || from || to || search || customerSearch;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
        <label className="mb-1 block text-xs font-medium text-slate-500">Customer</label>
        <Input
          placeholder="Customer name..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
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
  );
}
