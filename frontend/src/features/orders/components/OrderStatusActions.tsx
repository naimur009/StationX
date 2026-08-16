'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import OrderCancelDialog from './OrderCancelDialog';
import OrderPaymentCaptureDialog from './OrderPaymentCaptureDialog';
import type { OrderDetail } from '../api';

interface OrderStatusActionsProps {
  order: OrderDetail;
  onStatusChange: (status: string, cancelReason?: string, paymentData?: Record<string, unknown>) => void;
  isLoading: boolean;
}

export default function OrderStatusActions({ order, onStatusChange, isLoading }: OrderStatusActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  const handleCancel = (reason: string) => {
    onStatusChange('cancelled', reason);
    setCancelOpen(false);
  };

  const handleCapture = (data: Record<string, unknown>) => {
    onStatusChange('completed', undefined, data);
    setCaptureOpen(false);
  };

  if (order.status === 'cancelled') {
    return (
      <div className="flex w-full items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:w-auto">
        Order cancelled
      </div>
    );
  }

  return (
    <PermissionGate module="orders" action="edit">
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-3">
        {(order.status === 'pending' || (order.status === 'completed' && order.paymentStatus !== 'paid')) && (
          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-none"
            disabled={isLoading}
            onClick={() => setCaptureOpen(true)}
          >
            Capture Payment
          </Button>
        )}

        {(order.status === 'pending' || (order.status === 'completed' && order.paymentStatus !== 'paid')) && (
          <Button
            variant={order.status === 'completed' ? 'destructive' : 'warning'}
            size="md"
            className="flex-1 sm:flex-none"
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

      <OrderPaymentCaptureDialog
        open={captureOpen}
        order={order}
        onClose={() => setCaptureOpen(false)}
        onCapture={handleCapture}
        isLoading={isLoading}
      />
    </PermissionGate>
  );
}
