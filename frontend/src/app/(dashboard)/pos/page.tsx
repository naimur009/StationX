'use client';

import { useState } from 'react';
import { usePosStore } from '@/features/pos/store';
import { useCreateOrder } from '@/features/pos/api';
import ProductGrid from '@/features/pos/components/ProductGrid';
import Cart from '@/features/pos/components/Cart';
import CouponInput from '@/features/pos/components/CouponInput';
import CustomerPicker from '@/features/pos/components/CustomerPicker';
import PaymentMethodSelector from '@/features/pos/components/PaymentMethodSelector';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

export default function PosPage() {
  const items = usePosStore((s) => s.items);
  const customer = usePosStore((s) => s.customer);
  const couponCode = usePosStore((s) => s.couponCode);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const paymentSplits = usePosStore((s) => s.paymentSplits);
  const submitting = usePosStore((s) => s.submitting);
  const setSubmitting = usePosStore((s) => s.setSubmitting);
  const reset = usePosStore((s) => s.reset);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawDiscount = couponType === 'percentage' ? subtotal * (couponDiscount / 100) : couponDiscount;
  const discountAmount = Math.min(rawDiscount, subtotal);
  const grandTotal = Math.round((subtotal - discountAmount) * 100) / 100;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');
  const createOrder = useCreateOrder();

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
        payment: {
          method: paymentMethod,
          ...(paymentMethod === 'split' ? { splits: paymentSplits } : {}),
        },
      };

      if (customer) {
        payload.customerId = customer.id;
      }

      if (couponCode) {
        payload.couponCode = couponCode;
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
      <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">Point of Sale</h1>
        </div>
        <ProductGrid />
      </div>

      <div className="w-96 shrink-0">
        <div className="flex h-full flex-col rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-slate-800">Current Order</h2>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <CustomerPicker />
            <Cart />
            <CouponInput />
            <PaymentMethodSelector />

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={items.length === 0 || submitting}
              onClick={handleCheckout}
            >
              {submitting ? 'Processing...' : `Place Order — BDT ${grandTotal.toFixed(2)}`}
            </Button>
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
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({couponCode})</span>
                  <span>-BDT {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (VAT)</span>
                <span>BDT 0.00</span>
              </div>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-slate-800">
              <span>Total</span>
              <span>BDT {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Payment</span>
              <span className="font-medium capitalize text-slate-800">{paymentMethod}</span>
            </div>
            {customer && (
              <div className="mt-1 flex justify-between">
                <span>Customer</span>
                <span className="font-medium text-slate-800">{customer.name}</span>
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
