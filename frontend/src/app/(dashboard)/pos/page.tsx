'use client';

import { useState } from 'react';
import { usePosStore } from '@/features/pos/store';
import { useEmployees, useCreateOrder } from '@/features/pos/api';
import ProductGrid from '@/features/pos/components/ProductGrid';
import Cart from '@/features/pos/components/Cart';
import CouponInput from '@/features/pos/components/CouponInput';
import PaymentMethodSelector from '@/features/pos/components/PaymentMethodSelector';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppError } from '@/lib/utils';
import { ShoppingCart, X, Percent, User, Table, ChevronDown, Banknote } from 'lucide-react';

export default function PosPage() {
  const items = usePosStore((s) => s.items);
  const customerName = usePosStore((s) => s.customerName);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const tableNumber = usePosStore((s) => s.tableNumber);
  const servedBy = usePosStore((s) => s.servedBy);
  const couponCode = usePosStore((s) => s.couponCode);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const discountPercent = usePosStore((s) => s.discountPercent);
  const cashTendered = usePosStore((s) => s.cashTendered);
  const submitting = usePosStore((s) => s.submitting);
  const setCustomerName = usePosStore((s) => s.setCustomerName);
  const setCustomerPhone = usePosStore((s) => s.setCustomerPhone);
  const setTableNumber = usePosStore((s) => s.setTableNumber);
  const setServedBy = usePosStore((s) => s.setServedBy);
  const setDiscountPercent = usePosStore((s) => s.setDiscountPercent);
  const setCashTendered = usePosStore((s) => s.setCashTendered);
  const setSubmitting = usePosStore((s) => s.setSubmitting);
  const reset = usePosStore((s) => s.reset);

  const [cartOpen, setCartOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');
  const createOrder = useCreateOrder();
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data ?? [];

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawDiscount = couponType === 'percentage' ? subtotal * (couponDiscount / 100) : couponDiscount;
  const couponDiscountAmount = Math.min(rawDiscount, subtotal);
  const manualDiscountAmount = discountPercent > 0 ? Math.round((subtotal * (discountPercent / 100)) * 100) / 100 : 0;
  const totalDiscount = Math.min(couponDiscountAmount + manualDiscountAmount, subtotal);
  const grandTotal = Math.round((subtotal - totalDiscount) * 100) / 100;

  const tendered = parseFloat(cashTendered) || 0;
  const changeAmount = tendered >= grandTotal ? Math.round((tendered - grandTotal) * 100) / 100 : 0;

  function handleCheckout() {
    setError('');
    if (items.length === 0) return;
    if (paymentMethod === 'cash' && (!cashTendered || parseFloat(cashTendered) <= 0)) {
      setError('Cash tendered is required for cash payments');
      return;
    }
    if (paymentMethod === 'cash' && parseFloat(cashTendered) < grandTotal) {
      setError('Cash tendered must be at least the total amount');
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        payment: { method: paymentMethod },
      };

      if (tableNumber) {
        payload.tableNumber = tableNumber;
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

      if (paymentMethod === 'cash' && tendered > 0) {
        payload.cashTendered = tendered;
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
    <>
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
                <Table className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Table number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="pl-9 text-sm"
                />
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
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Customer name & phone (optional) */}
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</p>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Customer name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Customer phone (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-9 text-sm"
                    inputMode="tel"
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

              {/* Payment */}
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</p>
                <PaymentMethodSelector />
                {paymentMethod === 'cash' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Cash tendered"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                    {tendered > 0 && (
                      <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm">
                        <span className="font-medium text-green-700">Change</span>
                        <span className="font-bold text-green-700">BDT {changeAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
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
                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon</span>
                    <span>-BDT {couponDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                {manualDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-BDT {manualDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>BDT 0.00</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 text-sm font-bold text-slate-800">
                  <span>Total</span>
                  <span>BDT {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0 || submitting}
                onClick={() => { setCartOpen(false); handleCheckout(); }}
              >
                {submitting ? 'Processing...' : `Place Order — BDT ${grandTotal.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Bill Summary"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Place Order
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between py-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">BDT {item.price.toFixed(2)} x {item.quantity}</p>
                </div>
                <p className="ml-4 text-sm font-semibold text-slate-800">BDT {item.lineTotal.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>BDT {subtotal.toFixed(2)}</span>
              </div>
              {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({couponCode})</span>
                  <span>-BDT {couponDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {manualDiscountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-BDT {manualDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (VAT)</span>
                <span>BDT 0.00</span>
              </div>
              {tendered > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Cash Tendered</span>
                  <span>BDT {tendered.toFixed(2)}</span>
                </div>
              )}
              {changeAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Change</span>
                  <span>BDT {changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-slate-800">
              <span>Total</span>
              <span>BDT {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {tableNumber && (
              <div className="flex justify-between">
                <span>Table</span>
                <span className="font-medium text-slate-800">{tableNumber}</span>
              </div>
            )}
            {servedBy && (() => {
              const emp = employees.find((e) => e.id === servedBy);
              return (
                <div className="mt-1 flex justify-between">
                  <span>Served by</span>
                  <span className="font-medium text-slate-800">{emp?.name || 'Unknown'}</span>
                </div>
              );
            })()}
            <div className="mt-1 flex justify-between">
              <span>Payment</span>
              <span className="font-medium capitalize text-slate-800">{paymentMethod}</span>
            </div>
            {(customerName || customerPhone) && (
              <div className="mt-1 flex justify-between">
                <span>Customer</span>
                <span className="font-medium text-slate-800">
                  {[customerName, customerPhone].filter(Boolean).join(' - ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={resultOpen}
        onClose={() => {}}
        title="Order Placed"
        size="sm"
        footer={
          <Button onClick={handleNewOrder}>
            New Order
          </Button>
        }
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm text-slate-600">Order has been placed successfully</p>
          <p className="text-lg font-bold text-slate-800">{orderNumber}</p>
        </div>
      </Dialog>
    </>
  );
}
