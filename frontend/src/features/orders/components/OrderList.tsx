'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS_CONFIG } from '../api';
import type { OrderListItem } from '../api';

interface OrderListProps {
  data: OrderListItem[];
  isLoading: boolean;
  isError: boolean;
  onView: (order: OrderListItem) => void;
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

const columns: Column<OrderListItem>[] = [
  {
    key: 'orderNumber',
    label: 'Order',
    render: (item) => (
      <span className="font-medium text-blue-600">{item.orderNumber}</span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer',
    render: (item) => (
      <span className="text-slate-700">{item.customerName || 'Walk-in'}</span>
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
    render: (item) => {
      const config = ORDER_STATUS_CONFIG[item.status];
      return <Badge variant={config?.variant || 'slate'}>{config?.label || item.status}</Badge>;
    },
  },
  {
    key: 'createdAt',
    label: 'Date',
    render: (item) => <span className="text-sm text-slate-500">{formatDate(item.createdAt)}</span>,
    hideOnMobile: true,
  },
];

function MobileOrderCard({ item, onView }: { item: OrderListItem; onView: (order: OrderListItem) => void }) {
  const config = ORDER_STATUS_CONFIG[item.status];
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50"
      onClick={() => onView(item)}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">{item.orderNumber}</span>
        <Badge variant={config?.variant || 'slate'}>{config?.label || item.status}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-slate-500">{item.customerName || 'Walk-in'}</span>
        <span className="font-semibold text-slate-800">{formatBdt(item.grandTotal)}</span>
      </div>
      <div className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</div>
    </button>
  );
}

export default function OrderList({ data, isLoading, isError, onView }: OrderListProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No orders found. Orders appear here once a POS sale is completed."
      onRowClick={(item) => onView(item)}
      mobileRender={(item) => <MobileOrderCard item={item} onView={onView} />}
    />
  );
}
