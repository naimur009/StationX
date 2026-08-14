'use client';

import { useState } from 'react';
import { AlertTriangle, CreditCard, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
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

function round2(n: number): number {
  return +n.toFixed(2);
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
  if (!customer) return '-';
  if (typeof customer === 'object' && 'name' in customer) return customer.name;
  return '-';
}

function getCustomerPhone(order: OrderDetailType): string | null {
  if (order.customerPhone) return order.customerPhone;
  const customer = order.customerId;
  if (!customer) return null;
  if (typeof customer === 'object' && 'phone' in customer) return customer.phone;
  return null;
}

function getStaffName(createdBy: OrderDetailType['createdBy']): string {
  if (createdBy && typeof createdBy === 'object' && 'name' in createdBy) return createdBy.name;
  return 'Staff';
}

function getServedBy(servedBy: OrderDetailType['servedBy']): string | null {
  if (!servedBy) return null;
  if (typeof servedBy === 'object' && 'name' in servedBy) return servedBy.name;
  return 'Server';
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="truncate text-right text-sm font-medium text-slate-800">{children}</span>
    </div>
  );
}

export default function OrderDetailView({ order }: OrderDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const statusMutation = useUpdateOrderStatus();
  const deleteMutation = useDeleteOrder();

  const statusConfig = ORDER_STATUS_CONFIG[order.status];

  const handleStatusChange = (status: string, cancelReason?: string, paymentData?: Record<string, unknown>) => {
    statusMutation.mutate({ id: order.id, status, cancelReason, ...paymentData } as Parameters<typeof statusMutation.mutate>[0]);
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{order.orderNumber}</h1>
            <Badge variant={statusConfig?.variant || 'slate'}>
              {statusConfig?.label || order.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatDate(order.createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            {order.status !== 'cancelled' && order.paymentStatus !== 'paid' && (
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
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Order"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="md" disabled={deleteMutation.isPending} onClick={handleDelete}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-800">{order.orderNumber}</span>?
          This action cannot be undone.
        </p>
        {deleteError && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500">{deleteError}</p>
        )}
      </Dialog>

      {/* Edit Order Dialog */}
      <OrderEditForm
        order={order}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => setEditOpen(false)}
      />

      {/* Order Info */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <ReceiptText className="h-4 w-4 text-primary" />
            Order Info
          </h3>
          <div className="divide-y divide-slate-100">
            {order.tableLabelSnapshot && (
              <InfoRow label="Table">
                <span className="flex items-center justify-end gap-1.5">
                  {order.tableLabelSnapshot}
                </span>
              </InfoRow>
            )}
            <InfoRow label="Customer">{getCustomerName(order)}</InfoRow>
            {getCustomerPhone(order) && (
              <InfoRow label="Phone">{getCustomerPhone(order)}</InfoRow>
            )}
            <InfoRow label="Staff">{getStaffName(order.createdBy)}</InfoRow>
            {getServedBy(order.servedBy) && (
              <InfoRow label="Served By">{getServedBy(order.servedBy)}</InfoRow>
            )}
            <InfoRow label="Status">
              <Badge variant={statusConfig?.variant || 'slate'}>{statusConfig?.label || order.status}</Badge>
            </InfoRow>
          </div>
        </div>

        {/* Payment Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment
          </h3>
          <div className="divide-y divide-slate-100">
            {order.previousPayments && order.previousPayments.length > 0 && (
              <div className="space-y-1 border-b border-dashed border-slate-200 py-2">
                {order.previousPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="truncate text-sm text-slate-400">
                      {p.method.charAt(0).toUpperCase() + p.method.slice(1)} (previous)
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatBdt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {order.payment && (
              <>
                <InfoRow label="Method">
                  <span className="capitalize">{order.payment.method}</span>
                </InfoRow>
                <InfoRow label="Payment Status">
                  <span className={`font-semibold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </InfoRow>
                {order.payment.method !== 'cash' && (() => {
                  const prevTotal = (order.previousPayments || []).reduce((s, p) => s + p.amount, 0);
                  return (
                    <InfoRow label="Amount">{formatBdt(order.grandTotal - prevTotal)}</InfoRow>
                  );
                })()}
                {order.payment.transactionId && (
                  <InfoRow label="Transaction ID">
                    <span className="break-all">{order.payment.transactionId}</span>
                  </InfoRow>
                )}
              </>
            )}
            {!order.payment && (
              <InfoRow label="Payment Status">
                <span className="font-semibold text-amber-600">Unpaid</span>
              </InfoRow>
            )}
            {order.cashTendered !== undefined && order.cashTendered !== null && (
              <InfoRow label="Cash Tendered">{formatBdt(order.cashTendered)}</InfoRow>
            )}
            {order.changeAmount !== undefined && order.changeAmount !== null && (
              <InfoRow label="Change">
                <span className="text-green-600">{formatBdt(order.changeAmount)}</span>
              </InfoRow>
            )}
            {order.completedAt && (
              <InfoRow label="Completed">
                <span className="text-slate-600">{formatDate(order.completedAt)}</span>
              </InfoRow>
            )}
            {order.cancelledAt && (
              <InfoRow label="Cancelled">
                <span className="text-slate-600">{formatDate(order.cancelledAt)}</span>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Cancel Reason */}
        {order.cancelReason && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Cancel Reason
            </h3>
            <p className="text-sm italic text-red-600">&ldquo;{order.cancelReason}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-bold text-slate-800">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.nameSnapshot}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                  <td className="hidden px-4 py-3 text-right text-slate-500 md:table-cell">{formatBdt(item.priceSnapshot)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{formatBdt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {(() => {
            const totalWithVat = round2(order.subtotal + order.taxAmount);
            const totalDiscount = round2(order.discountAmount + order.taxAmount);
            return (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-800">{formatBdt(order.subtotal)}</span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">VAT</span>
                    <span className="text-slate-800">{formatBdt(order.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-600">Subtotal + VAT</span>
                  <span>{formatBdt(totalWithVat)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-green-600">Discount</span>
                    <span className="text-green-600">-{formatBdt(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatBdt(order.grandTotal)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Bill */}
      <BillView orderId={order.id} orderNumber={order.orderNumber} />
    </div>
  );
}