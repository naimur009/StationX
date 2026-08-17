'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ReceiptText, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderFilters from '@/features/orders/components/OrderFilters';
import OrderList from '@/features/orders/components/OrderList';
import { useOrderList, useDeleteOrder } from '@/features/orders/api';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/socket';
import type { OrdersFilterFormData } from '@/features/orders/schema';
import type { OrderListItem } from '@/features/orders/api';

const EMPTY_ORDERS: OrderListItem[] = [];

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OrdersFilterFormData>({});
  const [deleteTarget, setDeleteTarget] = useState<OrderListItem | null>(null);
  const deleteMutation = useDeleteOrder();

  useEffect(() => {
    const socket = getSocket();
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

  const { data, isLoading, isError, isRefetching, refetch } = useOrderList({
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    range: filters.range,
    from: filters.from,
    to: filters.to,
    customerPhone: filters.customerPhone,
    search: filters.search,
    sort: '-createdAt',
  });

  const orders = data?.data ?? EMPTY_ORDERS;

  const stats = useMemo(() => {
    const counts = { total: orders.length, pending: 0, completed: 0, cancelled: 0 };
    for (const o of orders) {
      if (o.status === 'pending') counts.pending += 1;
      else if (o.status === 'completed') counts.completed += 1;
      else if (o.status === 'cancelled') counts.cancelled += 1;
    }
    return counts;
  }, [orders]);

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
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Failed to delete order');
      },
    });
  };

  const statItems = [
    { label: 'Orders', value: stats.total, icon: ReceiptText, className: 'text-primary', iconBg: 'bg-primary' },
    { label: 'Pending', value: stats.pending, icon: Clock, className: 'text-warning', iconBg: 'bg-warning' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, className: 'text-success', iconBg: 'bg-success' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, className: 'text-destructive', iconBg: 'bg-destructive' },
  ];

  return (
    <PermissionGate module="orders" action="view">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Orders</h1>
            <p className="mt-1 text-sm text-slate-500">View and manage all orders</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start sm:self-auto"
            disabled={isRefetching}
            onClick={() => refetch()}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {!isLoading && !isError && orders.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {statItems.map(({ label, value, icon: Icon, className, iconBg }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${iconBg}`}>
                  <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-500">{label}</p>
                  <p className={`text-lg font-bold leading-tight sm:text-xl ${className}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <OrderFilters onFilter={handleFilter} />
        </div>

        <OrderList
          data={orders}
          isLoading={isLoading}
          isError={isError}
          onView={handleView}
          onDelete={handleDelete}
          deletePending={deleteMutation.isPending}
        />

        <Dialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Order"
          size="sm"
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="md"
                disabled={deleteMutation.isPending}
                onClick={handleDeleteConfirm}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteTarget?.orderNumber}</span>?
            This action cannot be undone.
          </p>
        </Dialog>
      </div>
    </PermissionGate>
  );
}