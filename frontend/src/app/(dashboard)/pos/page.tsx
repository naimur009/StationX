'use client';

import { useState, useEffect, useRef } from 'react';
import { usePosStore } from '@/features/pos/store';
import { useEmployees, useCreateOrder, useLookupCustomer } from '@/features/pos/api';
import { useTableList } from '@/features/tables/api';
import { usePublicSettings } from '@/features/settings/api';
import ProductGrid from '@/features/pos/components/ProductGrid';
import Cart from '@/features/pos/components/Cart';
import CouponInput from '@/features/pos/components/CouponInput';
import OrderConfirmationDialog from '@/features/pos/components/OrderConfirmationDialog';
import OrderResultDialog from '@/features/pos/components/OrderResultDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppError } from '@/lib/utils';
import { ShoppingCart, X, Percent, User, Table, ChevronDown } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';

export default function PosPage() {
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
  const submitting = usePosStore((s) => s.submitting);
  const setCustomerName = usePosStore((s) => s.setCustomerName);
  const setCustomerPhone = usePosStore((s) => s.setCustomerPhone);
  const setTableId = usePosStore((s) => s.setTableId);
  const setServedBy = usePosStore((s) => s.setServedBy);
  const setDiscountPercent = usePosStore((s) => s.setDiscountPercent);
  const setSubmitting = usePosStore((s) => s.setSubmitting);
  const reset = usePosStore((s) => s.reset);

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
  const { data: settingsData } = usePublicSettings();
  const loyaltyThreshold = settingsData?.data?.loyaltyOrderThreshold ?? 0;

  const [lookedUpCust, setLookedUpCust] = useState<{ name: string; orderCount: number } | null>(null);
  const [lookingUpCust, setLookingUpCust] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const custTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isLoyaltyMilestone = loyaltyThreshold > 0 && lookedUpCust !== null && lookedUpCust.orderCount > 0 && lookedUpCust.orderCount % loyaltyThreshold === 0;

  useEffect(() => {
    if (custTimerRef.current) clearTimeout(custTimerRef.current);
    const trimmed = customerPhone.trim();
    if (!trimmed) {
      setLookupPhone('');
      setLookedUpCust(null);
      setLookingUpCust(false);
      return;
    }
    setLookingUpCust(true);
    custTimerRef.current = setTimeout(() => setLookupPhone(trimmed), 500);
    return () => {
      if (custTimerRef.current) clearTimeout(custTimerRef.current);
    };
  }, [customerPhone]);

  const { data: lookupRes, isError: lookupFailed } = useLookupCustomer(lookupPhone);

  useEffect(() => {
    if (!lookupPhone) return;
    if (lookupRes) {
      const match = lookupRes.data.find((c) => c.phone === lookupPhone);
      if (match) {
        setLookedUpCust({ name: match.name, orderCount: match.orderCount });
        setCustomerName(match.name);
      } else {
        setLookedUpCust(null);
        setCustomerName('');
      }
      setLookingUpCust(false);
    } else if (lookupFailed) {
      setLookedUpCust(null);
      setLookingUpCust(false);
    }
  }, [lookupRes, lookupFailed, lookupPhone, setCustomerName]);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawCouponDiscount = couponType === 'percentage' ? subtotal * (couponDiscount / 100) : couponDiscount;
  const couponDiscountAmount = couponMaxDiscount != null ? Math.min(rawCouponDiscount, couponMaxDiscount) : rawCouponDiscount;
  const manualDiscountAmount = discountPercent > 0 ? Math.round((subtotal * (discountPercent / 100)) * 100) / 100 : 0;

  const discountAmount = Math.round((couponDiscountAmount + manualDiscountAmount) * 100) / 100;
  const taxAmount = Math.round(items.reduce((sum, i) => sum + Math.round((i.lineTotal * ((i.vatRate || 0) / 100)) * 100) / 100, 0) * 100) / 100;
  const totalWithVat = Math.round((subtotal + taxAmount) * 100) / 100;
  const totalDiscount = Math.round((discountAmount + taxAmount) * 100) / 100;
  const grandTotal = Math.round((totalWithVat - totalDiscount) * 100) / 100;

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
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-800">Point of Sale</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Cart
                  {items.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {items.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

          <ProductGrid />
        </div>

        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
            cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setCartOpen(false)}
        />
        <div
          className={`fixed bottom-0 right-0 top-16 z-50 w-full max-w-sm transform rounded-t-2xl border border-border bg-white shadow-xl transition-transform duration-300 lg:static lg:z-auto lg:w-96 lg:shrink-0 lg:transform-none lg:rounded-2xl lg:border-border lg:bg-white lg:shadow-sm ${
            cartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">Current Order</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="relative">
                <Table className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-white px-9 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                >
                  <option value="">No table</option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber}{t.capacity ? ` (Seats ${t.capacity})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Server/Employee */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
                <select
                  value={servedBy}
                  onChange={(e) => setServedBy(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-white px-9 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                >
                  <option value="">Who served?</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Customer name & phone (optional) with auto-lookup */}
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</p>
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="tel"
                      placeholder="Customer phone (optional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="min-h-[28px]">
                    {lookingUpCust && <p className="mt-1 text-xs text-slate-400">Looking up customer...</p>}
                    {!lookingUpCust && lookedUpCust && (
                      <div className="mt-1.5 rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {lookedUpCust.orderCount} order{lookedUpCust.orderCount !== 1 ? 's' : ''} placed
                      </div>
                    )}
                    {isLoyaltyMilestone && (
                      <div className="mt-1.5 rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-800">
                        This customer has placed {lookedUpCust!.orderCount} orders with us.
                        Congratulations on reaching {lookedUpCust!.orderCount} orders!
                      </div>
                    )}
                    {!lookingUpCust && customerPhone.trim() && !lookedUpCust && (
                      <p className="mt-1 text-xs text-amber-600">New customer</p>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Customer name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`pl-9 text-sm ${lookedUpCust ? 'bg-slate-50 text-slate-500' : ''}`}
                    readOnly={!!lookedUpCust}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</p>
                <Cart />
              </div>

              {/* Discounts */}
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discounts</p>
                <CouponInput />
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Discount % (optional)"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              {/* Mini bill preview */}
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>BDT {subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>VAT</span>
                    <span>BDT {taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Subtotal + VAT</span>
                  <span>BDT {totalWithVat.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Discount {discountPercent > 0 ? `(${discountPercent}%)` : ''}</span>
                    <span>-BDT {totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1 text-sm font-bold text-slate-800">
                  <span>Total</span>
                  <span>BDT {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <PermissionGate module="pos" action="create">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={items.length === 0 || submitting}
                  onClick={() => { setCartOpen(false); handleCheckout(); }}
                >
                  {submitting ? 'Processing...' : `Place Order — BDT ${grandTotal.toFixed(2)}`}
                </Button>
              </PermissionGate>

              {items.length > 0 && (
                <Button
                  variant="secondary"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setCartOpen(false);
                    reset();
                  }}
                >
                  Clear Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrderConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        items={items}
        subtotal={subtotal}
        taxAmount={taxAmount}
        totalWithVat={totalWithVat}
        totalDiscount={totalDiscount}
        grandTotal={grandTotal}
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
