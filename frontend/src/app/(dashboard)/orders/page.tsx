'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderFilters from '@/features/orders/components/OrderFilters';
import OrderList from '@/features/orders/components/OrderList';
import { useOrderList, useDeleteOrder } from '@/features/orders/api';
import { getSocket } from '@/lib/socket';
import type { OrdersFilterFormData } from '@/features/orders/schema';
import type { OrderListItem } from '@/features/orders/api';

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OrdersFilterFormData>({});
  const [deleteTarget, setDeleteTarget] = useState<OrderListItem | null>(null);
  const deleteMutation = useDeleteOrder();

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

    socket.on('pos:order_created', invalidate);
    socket.on('order:created', invalidate);
    socket.on('order:statusChanged', invalidate);
    socket.on('order:updated', invalidate);
    socket.on('order:deleted', invalidate);
    socket.on('dashboard:metricsInvalidate', invalidate);

    return () => {
      socket.off('pos:order_created', invalidate);
      socket.off('order:created', invalidate);
      socket.off('order:statusChanged', invalidate);
      socket.off('order:updated', invalidate);
      socket.off('order:deleted', invalidate);
      socket.off('dashboard:metricsInvalidate', invalidate);
    };
  }, [queryClient]);

  const { data, isLoading, isError } = useOrderList({
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    from: filters.from,
    to: filters.to,
    customerPhone: filters.customerPhone,
    search: filters.search,
    sort: '-createdAt',
  });

  const handleFilter = useCallback((newFilters: OrdersFilterFormData) => {
    setFilters(newFilters);
  }, []);

  const handleView = (order: OrderListItem) => {
    router.push(`/orders/${order.id}`);
  };

  const handleDelete = (order: OrderListItem) => {
    setDeleteTarget(order);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
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
          onDelete={handleDelete}
          deletePending={deleteMutation.isPending}
        />

        {/* Delete confirmation dialog */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
            <div
              className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-slate-800">Delete Order</h2>
              <p className="mt-2 text-sm text-slate-600">
                Are you sure you want to delete {deleteTarget.orderNumber}? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="md" disabled={deleteMutation.isPending} onClick={handleDeleteConfirm}>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
