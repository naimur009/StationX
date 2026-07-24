'use client';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OrderResultDialogProps {
  open: boolean;
  orderNumber: string;
  onNewOrder: () => void;
}

export default function OrderResultDialog({ open, orderNumber, onNewOrder }: OrderResultDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      title="Order Placed"
      size="sm"
      footer={
        <Button onClick={onNewOrder}>New Order</Button>
      }
    >
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Order has been placed successfully</p>
        <p className="text-lg font-bold text-foreground">{orderNumber}</p>
      </div>
    </Dialog>
  );
}
