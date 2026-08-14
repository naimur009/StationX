'use client';

import { CalendarClock, Eye, ReceiptText, Trash2, Utensils } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import { ORDER_STATUS_CONFIG } from '../api';
import type { OrderListItem } from '../api';

interface OrderListProps {
  data: OrderListItem[];
  isLoading: boolean;
  isError: boolean;
  onView: (order: OrderListItem) => void;
  onDelete: (order: OrderListItem) => void;
  deletePending: boolean;
}

function formatBdt(n: number): string {
  return `\u09F3${n.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OrderStatusBadge({ item }: { item: OrderListItem }) {
  if (item.status === 'completed') {
    return (
      <Badge variant={item.paymentStatus === 'paid' ? 'green' : 'yellow'}>
        {item.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
      </Badge>
    );
  }
  const config = ORDER_STATUS_CONFIG[item.status];
  return <Badge variant={config?.variant || 'slate'}>{config?.label || item.status}</Badge>;
}

function MobileOrderCard({ item, onView, onDelete, deletePending }: { item: OrderListItem; onView: (order: OrderListItem) => void; onDelete: (order: OrderListItem) => void; deletePending: boolean }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
        onClick={() => onView(item)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{item.orderNumber}</p>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <CalendarClock className="h-3 w-3" />
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>
          <OrderStatusBadge item={item} />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Utensils className="h-3.5 w-3.5 text-slate-400" />
            {item.tableLabelSnapshot ? `Table ${item.tableLabelSnapshot}` : 'Takeaway'}
          </span>
          <span className="text-base font-bold text-slate-900">{formatBdt(item.grandTotal)}</span>
        </div>
      </button>

      <PermissionGate module="orders" action="delete">
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2">
          <Button variant="outline" size="xs" onClick={() => onView(item)}>
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
          <Button variant="destructive" size="xs" disabled={deletePending} onClick={() => onDelete(item)}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      </PermissionGate>
    </div>
  );
}

export default function OrderList({ data, isLoading, isError, onView, onDelete, deletePending }: OrderListProps) {
  const columns: Column<OrderListItem>[] = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (item) => (
        <span className="font-medium text-primary">{item.orderNumber}</span>
      ),
    },
    {
      key: 'tableLabelSnapshot',
      label: 'Table',
      render: (item) => (
        <span className="text-slate-700">{item.tableLabelSnapshot || 'Takeaway'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (item) => (
        <span className="text-slate-700">{item.customerName || '-'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'grandTotal',
      label: 'Total',
      render: (item) => <span className="font-semibold">{formatBdt(item.grandTotal)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <OrderStatusBadge item={item} />,
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (item) => (
        <div className="text-sm">
          <p className="text-slate-500">{formatTime(item.createdAt)}</p>
          <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No orders found. Orders appear here once a POS sale is completed."
      onRowClick={(item) => onView(item)}
      mobileRender={(item) => <MobileOrderCard item={item} onView={onView} onDelete={onDelete} deletePending={deletePending} />}
    />
  );
}