'use client';

import { useState } from 'react';
import { AlertTriangle, CreditCard, MapPin, Phone, ReceiptText, User } from 'lucide-react';
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

function InfoRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-lg px-1 py-2 transition-colors hover:bg-slate-50/80">
      <span className="flex shrink-0 items-center gap-2.5 text-[13px] text-slate-500">
        {icon && <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-400 transition-colors group-hover:bg-slate-200/70 group-hover:text-slate-500">{icon}</span>}
        {label}
      </span>
      <span className="truncate text-right text-[13px] font-semibold text-slate-700">{children}</span>
    </div>
  );
}

function DetailCard({
  title,
  icon,
  accentColor = 'primary',
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor?: 'primary' | 'success' | 'red';
  children: React.ReactNode;
  className?: string;
}) {
  const accentMap = {
    primary: {
      bar: 'bg-gradient-to-r from-primary to-primary/70',
      iconBg: 'bg-primary/10 text-primary',
    },
    success: {
      bar: 'bg-gradient-to-r from-success to-success/70',
      iconBg: 'bg-success/10 text-success',
    },
    red: {
      bar: 'bg-gradient-to-r from-red-500 to-rose-400',
      iconBg: 'bg-red-50 text-red-500',
    },
  };
  const accent = accentMap[accentColor];

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md ${className ?? ''}`}>
      {/* Accent bar */}
      <div className={`h-1 w-full ${accent.bar}`} />
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent.iconBg}`}>
          {icon}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">{title}</h3>
      </div>
      {/* Content */}
      <div className="flex-1 px-4 py-3 sm:px-5 sm:py-4">{children}</div>
    </div>
  );
}

function SummaryStat({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 sm:px-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-bold text-slate-800 sm:text-base ${valueClass ?? ''}`}>{value}</p>
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

  const totalWithVat = round2(order.subtotal + order.taxAmount);
  const totalDiscount = round2(order.discountAmount + order.taxAmount);
  const previousPaymentsTotal = (order.previousPayments || []).reduce((s, p) => s + p.amount, 0);
  const canEdit = order.status !== 'cancelled' && order.paymentStatus !== 'paid';

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-800 sm:text-2xl">{order.orderNumber}</h1>
                  <Badge variant={statusConfig?.variant || 'slate'}>
                    {statusConfig?.label || order.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                  Created {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <OrderStatusActions
                order={order}
                onStatusChange={handleStatusChange}
                isLoading={statusMutation.isPending}
              />
              <PermissionGate module="orders" action="delete">
                <Button
                  variant="destructive"
                  size="md"
                  className="w-full sm:w-auto"
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </PermissionGate>
              <PermissionGate module="orders" action="edit">
                {canEdit && (
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                    onClick={() => setEditOpen(true)}
                  >
                    Edit
                  </Button>
                )}
              </PermissionGate>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-4 sm:grid-cols-4 sm:gap-3">
            <SummaryStat label="Grand Total" value={formatBdt(order.grandTotal)} valueClass="text-primary" />
            <SummaryStat label="Items" value={`${order.items.length} item${order.items.length === 1 ? '' : 's'}`} />
            <SummaryStat
              label="Payment"
              value={order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
              valueClass={order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}
            />
            <SummaryStat
              label="Table"
              value={order.tableLabelSnapshot ? `Table ${order.tableLabelSnapshot}` : 'Takeaway'}
            />
          </div>
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

      {/* Cancel Reason — full-width alert banner */}
      {order.cancelReason && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50 to-rose-50/80 px-4 py-3.5 shadow-sm sm:items-center sm:gap-4 sm:px-5 sm:py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100/80 text-red-500">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">Cancellation Reason</p>
            <p className="mt-0.5 text-sm font-medium text-red-700">&ldquo;{order.cancelReason}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Order Info + Payment */}
      <div className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Order Info */}
        <DetailCard title="Order Info" icon={<ReceiptText className="h-4 w-4" />} accentColor="primary">
          <div className="space-y-0.5">
            {order.tableLabelSnapshot && (
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Table">
                {order.tableLabelSnapshot}
              </InfoRow>
            )}
            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Customer">{getCustomerName(order)}</InfoRow>
            {getCustomerPhone(order) && (
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone">{getCustomerPhone(order)}</InfoRow>
            )}
            <InfoRow label="Staff">{getStaffName(order.createdBy)}</InfoRow>
            {getServedBy(order.servedBy) && (
              <InfoRow label="Served By">{getServedBy(order.servedBy)}</InfoRow>
            )}
            <InfoRow label="Status">
              <Badge variant={statusConfig?.variant || 'slate'}>{statusConfig?.label || order.status}</Badge>
            </InfoRow>
          </div>
        </DetailCard>

        {/* Payment Info */}
        <DetailCard title="Payment" icon={<CreditCard className="h-4 w-4" />} accentColor="success">
          <div className="space-y-0.5">
            {order.previousPayments && order.previousPayments.length > 0 && (
              <div className="mb-2 space-y-1 rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Previous Payments</p>
                {order.previousPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="truncate text-xs text-slate-500">
                      {p.method.charAt(0).toUpperCase() + p.method.slice(1)}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-slate-600">{formatBdt(p.amount)}</span>
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
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${order.paymentStatus === 'paid' ? 'text-success' : 'text-amber-600'}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${order.paymentStatus === 'paid' ? 'bg-success' : 'bg-amber-500'}`} />
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </InfoRow>
                {order.payment.method !== 'cash' && (
                  <InfoRow label="Amount">{formatBdt(order.grandTotal - previousPaymentsTotal)}</InfoRow>
                )}
                {order.payment.transactionId && (
                  <InfoRow label="Transaction ID">
                    <span className="break-all text-xs">{order.payment.transactionId}</span>
                  </InfoRow>
                )}
              </>
            )}
            {!order.payment && (
              <InfoRow label="Payment Status">
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unpaid
                </span>
              </InfoRow>
            )}
            {order.cashTendered !== undefined && order.cashTendered !== null && (
              <InfoRow label="Cash Tendered">{formatBdt(order.cashTendered)}</InfoRow>
            )}
            {order.changeAmount !== undefined && order.changeAmount !== null && (
              <InfoRow label="Change">
                <span className="text-success">{formatBdt(order.changeAmount)}</span>
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
        </DetailCard>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            Items
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {order.items.length}
            </span>
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.nameSnapshot}</td>
                  <td className="px-4 py-3 text-center text-slate-700">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatBdt(item.priceSnapshot)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatBdt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2.5 sm:hidden">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{item.nameSnapshot}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.quantity} × {formatBdt(item.priceSnapshot)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-800">{formatBdt(item.lineTotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:max-w-md sm:p-6">
          <div className="space-y-2.5">
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
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3.5 py-3 text-base font-bold">
              <span>Grand Total</span>
              <span className="text-primary">{formatBdt(order.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill */}
      <BillView orderId={order.id} orderNumber={order.orderNumber} />
    </div>
  );
}