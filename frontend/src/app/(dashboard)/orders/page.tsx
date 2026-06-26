'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderFilters from '@/features/orders/components/OrderFilters';
import OrderList from '@/features/orders/components/OrderList';
import { useOrderList } from '@/features/orders/api';
import type { OrdersFilterFormData } from '@/features/orders/schema';
import type { OrderListItem } from '@/features/orders/api';

export default function OrdersPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<OrdersFilterFormData>({});

  const { data, isLoading, isError } = useOrderList({
    status: filters.status,
    from: filters.from,
    to: filters.to,
    search: filters.search,
    sort: '-createdAt',
  });

  const handleFilter = useCallback((newFilters: OrdersFilterFormData) => {
    setFilters(newFilters);
  }, []);

  const handleView = (order: OrderListItem) => {
    router.push(`/orders/${order.id}`);
  };

  return (
    <PermissionGate module="orders" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">Orders</h1>
            <p className="mt-1 text-sm text-slate-500">View and manage all orders</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <OrderFilters onFilter={handleFilter} />
        </div>

        <OrderList
          data={data?.data || []}
          isLoading={isLoading}
          isError={isError}
          onView={handleView}
        />
      </div>
    </PermissionGate>
  );
}
