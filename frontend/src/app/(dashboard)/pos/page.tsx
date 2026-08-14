'use client';

import { useEffect, useState } from 'react';
import { usePosStore } from '@/features/pos/store';
import { useCreateOrder, useEmployees } from '@/features/pos/api';
import { useTableList } from '@/features/tables/api';
import { computePosTotals } from '@/features/pos/totals';
import ProductGrid from '@/features/pos/components/ProductGrid';
import OrderPanel from '@/features/pos/components/OrderPanel';
import OrderConfirmationDialog from '@/features/pos/components/OrderConfirmationDialog';
import OrderResultDialog from '@/features/pos/components/OrderResultDialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';
import { useUIStore } from '@/stores/ui-store';
import { useTableStatusSync } from '@/hooks/useTableStatusSync';

export default function PosPage() {
  useTableStatusSync();
  const items = usePosStore((s) => s.items);
  const customerName = usePosStore((s) => s.customerName);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const tableId = usePosStore((s) => s.tableId);
  const servedBy = usePosStore((s) => s.servedBy);
  const couponCode = usePosStore((s) => s.couponCode);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const couponMaxDiscount = usePosStore((s) => s.couponMaxDiscount);
  const discountPercent = usePosStore((s) => s.discountPercent);
  const setSubmitting = usePosStore((s) => s.setSubmitting);
  const setTableId = usePosStore((s) => s.setTableId);
  const reset = usePosStore((s) => s.reset);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  const [cartOpen, setCartOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');
  const createOrder = useCreateOrder();
  const { data: tablesData } = useTableList({ status: 'available' });
  const availableTables = tablesData?.data ?? [];
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data ?? [];

  const totals = computePosTotals(items, couponDiscount, couponType, couponMaxDiscount, discountPercent);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    if (table) setTableId(table);
  }, [setTableId]);

  function handleCheckout() {
    setError('');
    if (items.length === 0) return;
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      };

      if (tableId) {
        payload.tableId = tableId;
      }

      if (customerName || customerPhone) {
        payload.customerName = customerName || undefined;
        payload.customerPhone = customerPhone || undefined;
      }

      if (servedBy) {
        payload.servedBy = servedBy;
      }

      if (couponCode) {
        payload.couponCode = couponCode;
      }

      if (discountPercent > 0) {
        payload.discountPercent = discountPercent;
      }

      const result = await createOrder.mutateAsync(payload);
      setOrderNumber(result.data.orderNumber);
      setResultOpen(true);
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNewOrder() {
    setResultOpen(false);
    setOrderNumber('');
    setError('');
    reset();
  }

  return (
    <PermissionGate module="pos" action="view">
      <div className="flex min-h-full flex-1 flex-col gap-4 pb-24 lg:h-full lg:flex-row lg:gap-6 lg:overflow-hidden lg:pb-0">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Point of Sale</h1>
            <span className="hidden text-sm text-slate-500 sm:inline">
              {items.length} item{items.length !== 1 ? 's' : ''} in cart
            </span>
          </div>

          <ProductGrid />
        </div>

        <OrderPanel
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          availableTables={availableTables}
          employees={employees}
          error={error}
          totals={totals}
          onPlaceOrder={() => {
            setCartOpen(false);
            handleCheckout();
          }}
          onClearOrder={() => {
            setCartOpen(false);
            reset();
          }}
        />
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.625rem)] pt-2.5 backdrop-blur transition-all duration-300 sm:px-6 lg:hidden ${sidebarCollapsed ? 'md:left-16' : 'md:left-64'}`}>
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
              {items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {items.length}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Total</p>
              <p className="truncate text-sm font-bold text-slate-800">BDT {totals.grandTotal.toFixed(2)}</p>
            </div>
          </div>
          <Button
            className="h-11 flex-1 sm:flex-none sm:px-8"
            disabled={items.length === 0}
            onClick={() => setCartOpen(true)}
          >
            View Cart
          </Button>
        </div>
      </div>

      <OrderConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        items={items}
        totals={totals}
        discountPercent={discountPercent}
        availableTables={availableTables}
        tableId={tableId}
        employees={employees}
        servedBy={servedBy}
        customerName={customerName}
        customerPhone={customerPhone}
        onConfirm={handleConfirm}
      />

      <OrderResultDialog
        open={resultOpen}
        orderNumber={orderNumber}
        onNewOrder={handleNewOrder}
      />
    </PermissionGate>
  );
}