'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderDetailView from '@/features/orders/components/OrderDetail';
import { useOrder } from '@/features/orders/api';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { data, isLoading, isError, error } = useOrder(orderId);

  if (isLoading) {
    return (
      <PermissionGate module="orders" action="view">
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </PermissionGate>
    );
  }

  if (isError) {
    const is404 = error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'NOT_FOUND';
    return (
      <PermissionGate module="orders" action="view">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-slate-700">
            {is404 ? 'Order not found' : 'Failed to load order'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {is404 ? 'This order may have been deleted or the link is invalid.' : 'Please try again.'}
          </p>
          <Link
            href="/orders"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </div>
      </PermissionGate>
    );
  }

  if (!data?.data) {
    return null;
  }

  return (
    <PermissionGate module="orders" action="view">
      <div className="space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <OrderDetailView order={data.data} />
      </div>
    </PermissionGate>
  );
}
