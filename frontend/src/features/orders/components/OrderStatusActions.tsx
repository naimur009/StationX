'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderCancelDialog from './OrderCancelDialog';
import type { OrderDetail } from '../api';

interface OrderStatusActionsProps {
  order: OrderDetail;
  onStatusChange: (status: string, cancelReason?: string) => void;
  isLoading: boolean;
}

export default function OrderStatusActions({ order, onStatusChange, isLoading }: OrderStatusActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleCancel = (reason: string) => {
    onStatusChange('cancelled', reason);
    setCancelOpen(false);
  };

  if (order.status === 'cancelled') {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        Order cancelled
      </div>
    );
  }

  return (
    <PermissionGate module="orders" action="edit">
      <div className="flex flex-wrap gap-3">
        {(order.status === 'pending') && (
          <Button
            variant="success"
            size="md"
            disabled={isLoading}
            onClick={() => onStatusChange('completed')}
          >
            Mark Completed
          </Button>
        )}

        {(order.status === 'pending' || order.status === 'completed') && (
          <Button
            variant={order.status === 'completed' ? 'destructive' : 'warning'}
            size="md"
            disabled={isLoading}
            onClick={() => setCancelOpen(true)}
          >
            {order.status === 'completed' ? 'Void / Refund' : 'Cancel Order'}
          </Button>
        )}
      </div>

      <OrderCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        isCompleted={order.status === 'completed'}
        isLoading={isLoading}
      />
    </PermissionGate>
  );
}
