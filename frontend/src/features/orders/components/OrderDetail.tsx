'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderStatusActions from './OrderStatusActions';
import OrderEditForm from './OrderEditForm';
import BillView from './BillView';
import { useUpdateOrderStatus, useDeleteOrder, ORDER_STATUS_CONFIG } from '../api';
import type { OrderDetail as OrderDetailType } from '../api';

interface OrderDetailViewProps {
  order: OrderDetailType;
}

function formatBdt(n: number): string {
  return `\u09F3${n.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCustomerName(order: OrderDetailType): string {
  if (order.customerName) return order.customerName;
  const customer = order.customerId;
  if (!customer) return 'Walk-in';
  if (typeof customer === 'object' && 'name' in customer) return customer.name;
  return 'Customer';
}

function getCustomerPhone(order: OrderDetailType): string | null {
  if (order.customerPhone) return order.customerPhone;
  const customer = order.customerId;
  if (!customer) return null;
  if (typeof customer === 'object' && 'phone' in customer) return customer.phone;
  return null;
}

function getStaffName(createdBy: OrderDetailType['createdBy']): string {
  if (typeof createdBy === 'object' && 'name' in createdBy) return createdBy.name;
  return 'Staff';
}

function getServedBy(servedBy: OrderDetailType['servedBy']): string | null {
  if (!servedBy) return null;
  if (typeof servedBy === 'object' && 'name' in servedBy) return servedBy.name;
  return 'Server';
}

export default function OrderDetailView({ order }: OrderDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const statusMutation = useUpdateOrderStatus();
  const deleteMutation = useDeleteOrder();

  const statusConfig = ORDER_STATUS_CONFIG[order.status];

  const handleStatusChange = (status: string, cancelReason?: string) => {
    statusMutation.mutate({ id: order.id, status, cancelReason });
  };

  const handleDelete = () => {
    deleteMutation.mutate(order.id, {
      onSuccess: () => {
        window.location.href = '/orders';
      },
    });
  };

  const deleteError = deleteMutation.error ? (typeof deleteMutation.error === 'object' && 'message' in deleteMutation.error ? (deleteMutation.error as { message: string }).message : 'Failed to delete order') : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{order.orderNumber}</h1>
            <Badge variant={statusConfig?.variant || 'slate'}>
              {statusConfig?.label || order.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatDate(order.createdAt)}</p>
        </div>

        <div className="flex items-center gap-3">
          <OrderStatusActions
            order={order}
            onStatusChange={handleStatusChange}
            isLoading={statusMutation.isPending}
          />
          <PermissionGate module="orders" action="delete">
            <Button
              variant="destructive"
              size="md"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </PermissionGate>
          <PermissionGate module="orders" action="edit">
            {order.status !== 'cancelled' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            )}
          </PermissionGate>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setDeleteOpen(false)}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-800">Delete Order</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete {order.orderNumber}? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 text-xs text-red-500">{deleteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" size="md" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="md" disabled={deleteMutation.isPending} onClick={handleDelete}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Dialog */}
      <OrderEditForm
        order={order}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => setEditOpen(false)}
      />

      {/* Order Info */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">Order Info</h3>
          <div className="space-y-2 text-sm">
            {order.tableNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Table</span>
                <span className="font-medium text-slate-800">{order.tableNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Customer</span>
              <span className="font-medium text-slate-800">
                {getCustomerName(order)}
              </span>
            </div>
            {getCustomerPhone(order) && (
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="font-medium text-slate-800">{getCustomerPhone(order)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Staff</span>
              <span className="font-medium text-slate-800">{getStaffName(order.createdBy)}</span>
            </div>
            {getServedBy(order.servedBy) && (
              <div className="flex justify-between">
                <span className="text-slate-500">Served By</span>
                <span className="font-medium text-slate-800">{getServedBy(order.servedBy)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <Badge variant={statusConfig?.variant || 'slate'}>{statusConfig?.label || order.status}</Badge>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">Payment</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Method</span>
              <span className="font-medium capitalize text-slate-800">{order.payment.method}</span>
            </div>
            {order.cashTendered !== undefined && order.cashTendered !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Tendered</span>
                <span className="font-medium text-slate-800">{formatBdt(order.cashTendered)}</span>
              </div>
            )}
            {order.changeAmount !== undefined && order.changeAmount !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Change</span>
                <span className="font-medium text-green-600">{formatBdt(order.changeAmount)}</span>
              </div>
            )}
            {order.completedAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Completed</span>
                <span className="text-slate-600">{formatDate(order.completedAt)}</span>
              </div>
            )}
            {order.cancelledAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cancelled</span>
                <span className="text-slate-600">{formatDate(order.cancelledAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Reason */}
        {order.cancelReason && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-700">Cancel Reason</h3>
            <p className="text-sm text-red-600 italic">&ldquo;{order.cancelReason}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.nameSnapshot}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                  <td className="hidden px-4 py-3 text-right text-slate-500 sm:table-cell">{formatBdt(item.priceSnapshot)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{formatBdt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-slate-800">{formatBdt(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                Discount{order.couponId ? ' (Coupon)' : ''} {order.discountPercent > 0 && `(${order.discountPercent}%)`}
              </span>
              <span className="text-green-600">-{formatBdt(order.discountAmount)}</span>
            </div>
          )}
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">VAT</span>
              <span className="text-slate-800">{formatBdt(order.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span className="text-slate-800">Grand Total</span>
            <span className="text-slate-800">{formatBdt(order.subtotal - order.discountAmount)}</span>
          </div>
        </div>
      </div>

      {/* Bill */}
      <BillView orderId={order.id} orderNumber={order.orderNumber} />
    </div>
  );
}
