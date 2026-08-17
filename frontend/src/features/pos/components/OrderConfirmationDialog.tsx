'use client';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import BillPreview from './BillPreview';
import type { CartItem } from '@/features/pos/schema';
import type { PosTotals } from '../totals';

interface OrderConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  totals: PosTotals;
  discountPercent: number;
  availableTables: Array<{ id: string; tableNumber: string }>;
  tableId: string;
  employees: Array<{ id: string; name: string }>;
  servedBy: string;
  customerName: string;
  customerPhone: string;
  onConfirm: () => void;
}

export default function OrderConfirmationDialog({
  open, onClose, items, totals, discountPercent, availableTables, tableId, employees, servedBy, customerName, customerPhone, onConfirm,
}: OrderConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Bill Summary"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <PermissionGate module="pos" action="create">
            <Button onClick={onConfirm}>Place Order</Button>
          </PermissionGate>
        </>
      }
    >
      <div className="space-y-4">
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">৳{item.price.toFixed(2)} x {item.quantity}</p>
              </div>
              <p className="ml-4 text-sm font-semibold text-foreground">৳{item.lineTotal.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-secondary/60 px-4 py-3">
          <BillPreview totals={totals} discountPercent={discountPercent} />
        </div>

        <div className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
          {tableId && (() => {
            const t = availableTables.find((tbl) => tbl.id === tableId);
            return (
              <div className="flex justify-between">
                <span>Table</span>
                <span className="font-medium text-foreground">{t?.tableNumber ?? tableId}</span>
              </div>
            );
          })()}
          {servedBy && (() => {
            const emp = employees.find((e) => e.id === servedBy);
            return (
              <div className="mt-1 flex justify-between">
                <span>Served by</span>
                <span className="font-medium text-foreground">{emp?.name || 'Unknown'}</span>
              </div>
            );
          })()}
          <div className="mt-1 flex justify-between">
            <span>Customer</span>
            <span className="font-medium text-foreground">
              {[customerName, customerPhone].filter(Boolean).join(' - ') || '\u2014'}
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}