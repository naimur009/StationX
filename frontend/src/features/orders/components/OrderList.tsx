'use client';

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



function MobileOrderCard({ item, onView, onDelete, deletePending }: { item: OrderListItem; onView: (order: OrderListItem) => void; onDelete: (order: OrderListItem) => void; deletePending: boolean }) {
  const config = ORDER_STATUS_CONFIG[item.status];
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <button type="button" className="w-full text-left" onClick={() => onView(item)}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">{item.orderNumber}</span>
          <Badge variant={config?.variant || 'slate'}>{config?.label || item.status}</Badge>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-slate-500">{item.tableNumber ? `Table ${item.tableNumber}` : 'Walk-in'}</span>
          <span className="font-semibold text-slate-800">{formatBdt(item.grandTotal)}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</div>
      </button>
      <PermissionGate module="orders" action="delete">
        <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">
          <Button variant="destructive" size="xs" disabled={deletePending} onClick={() => onDelete(item)}>
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
        <span className="font-medium text-blue-600">{item.orderNumber}</span>
      ),
    },
    {
      key: 'tableNumber',
      label: 'Table',
      render: (item) => (
        <span className="text-slate-700">{item.tableNumber || '-'}</span>
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
        if (item.status === 'completed') {
          return (
            <Badge variant={item.paymentStatus === 'paid' ? 'green' : 'yellow'}>
              {item.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
            </Badge>
          );
        }
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
