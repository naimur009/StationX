'use client';

import { useEffect, useRef, useState } from 'react';
import { usePosStore } from '../store';
import { useLookupCustomer } from '../api';
import { usePublicSettings } from '@/features/settings/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import Cart from './Cart';
import CouponInput from './CouponInput';
import BillPreview from './BillPreview';
import type { PosTotals } from '../totals';
import { ChevronDown, Percent, Table, User, X } from 'lucide-react';

interface OrderPanelProps {
  open: boolean;
  onClose: () => void;
  availableTables: Array<{ id: string; tableNumber: string; capacity?: number | null }>;
  employees: Array<{ id: string; name: string }>;
  error: string;
  totals: PosTotals;
  onPlaceOrder: () => void;
  onClearOrder: () => void;
}

const selectClass =
  'flex h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring';

export default function OrderPanel({
  open,
  onClose,
  availableTables,
  employees,
  error,
  totals,
  onPlaceOrder,
  onClearOrder,
}: OrderPanelProps) {
  const items = usePosStore((s) => s.items);
  const customerName = usePosStore((s) => s.customerName);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const tableId = usePosStore((s) => s.tableId);
  const servedBy = usePosStore((s) => s.servedBy);
  const discountPercent = usePosStore((s) => s.discountPercent);
  const submitting = usePosStore((s) => s.submitting);
  const setCustomerName = usePosStore((s) => s.setCustomerName);
  const setCustomerPhone = usePosStore((s) => s.setCustomerPhone);
  const setTableId = usePosStore((s) => s.setTableId);
  const setServedBy = usePosStore((s) => s.setServedBy);
  const setDiscountPercent = usePosStore((s) => s.setDiscountPercent);
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

  return (
    <>
      <div
        className={`fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col bg-white transition-transform duration-300 ease-out lg:static lg:h-full lg:max-h-none lg:w-[460px] lg:border-l lg:border-border lg:shadow-2xl ${
          open ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 lg:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            <h2 className="text-[13px] font-bold text-slate-800">Current Order</h2>
            {items.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <section className="shrink-0 space-y-2.5 border-b border-border px-4 py-3 lg:px-5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <Table className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className={selectClass}
                aria-label="Table"
              >
                <option value="">No table</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tableNumber}
                    {t.capacity ? ` (Seats ${t.capacity})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={servedBy}
                onChange={(e) => setServedBy(e.target.value)}
                className={selectClass}
                aria-label="Served by"
              >
                <option value="">Served by</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="tel"
                placeholder="Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-9 pl-8 text-[13px]"
                aria-label="Customer phone"
              />
            </div>
            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`h-9 pl-8 text-[13px] ${lookedUpCust ? 'bg-slate-50 text-slate-500' : ''}`}
                readOnly={!!lookedUpCust}
                aria-label="Customer name"
              />
            </div>
          </div>

          <div className="min-h-[18px] px-0.5">
            {lookingUpCust && <p className="text-[11px] text-slate-400">Looking up customer...</p>}
            {!lookingUpCust && lookedUpCust && (
              <p className="text-[11px] font-medium text-green-600">
                {lookedUpCust.orderCount} order{lookedUpCust.orderCount !== 1 ? 's' : ''} placed
              </p>
            )}
            {isLoyaltyMilestone && (
              <p className="text-[11px] font-semibold text-purple-600">
                Milestone: {lookedUpCust!.orderCount} orders — congratulations!
              </p>
            )}
            {!lookingUpCust && customerPhone.trim() && !lookedUpCust && (
              <p className="text-[11px] font-medium text-amber-600">New customer</p>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <CouponInput />
            </div>
            <div className="relative w-28 shrink-0">
              <Percent className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Disc %"
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="h-9 pl-8 text-[13px]"
                aria-label="Discount percent"
              />
            </div>
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-2 lg:px-5">
          <Cart />
        </section>

        <footer className="shrink-0 space-y-2.5 border-t border-border bg-white px-4 py-3 lg:px-5">
          <BillPreview totals={totals} discountPercent={discountPercent} />

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          <PermissionGate module="pos" action="create">
            <Button
              className="h-11 w-full text-sm font-semibold"
              size="lg"
              disabled={items.length === 0 || submitting}
              onClick={onPlaceOrder}
            >
              {submitting ? 'Processing...' : `Place Order — BDT ${totals.grandTotal.toFixed(2)}`}
            </Button>
          </PermissionGate>

          {items.length > 0 && (
            <Button
              variant="ghost"
              className="h-8 w-full bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700"
              onClick={onClearOrder}
            >
              Clear Order
            </Button>
          )}
        </footer>
      </div>
    </>
  );
}