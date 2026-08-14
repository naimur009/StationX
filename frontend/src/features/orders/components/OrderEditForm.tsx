'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useUpdateOrder } from '../api';
import { useCatalog, type CatalogProduct } from '@/features/pos/api';
import { useTableList } from '@/features/tables/api';
import type { OrderDetail, OrderItemUpdate } from '../api';
import { Trash2, Plus, Minus, Search, ChevronDown } from 'lucide-react';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface OrderEditFormProps {
  order: OrderDetail;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderEditForm({ order, open, onClose, onSaved }: OrderEditFormProps) {
  const [tableId, setTableId] = useState<string>(order.tableId || '');
  const [items, setItems] = useState<OrderItemUpdate[]>(
    order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
  );
  const [discountPercent, setDiscountPercent] = useState(order.discountPercent);
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [error, setError] = useState('');

  const updateMutation = useUpdateOrder();
  const { data: catalogRes, isError: catalogFailed } = useCatalog();
  const productCatalog = useMemo(() => catalogRes?.data ?? [], [catalogRes]);
  const { data: tablesData } = useTableList();
  const tables = tablesData?.data ?? [];

  useEffect(() => {
    if (!open) return;
    setTableId(order.tableId || '');
    setItems(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    setDiscountPercent(order.discountPercent);
    setError('');
  }, [open, order]);

  const productMap = useMemo(() => new Map(productCatalog.map((p) => [p.id, p])), [productCatalog]);

  const computedItems = useMemo(() => items.map((item) => {
    const product = productMap.get(item.productId);
    const price = product?.price ?? 0;
    return { ...item, name: product?.name || 'Unknown', price, lineTotal: round2(price * item.quantity) };
  }), [items, productMap]);

  const subtotal = round2(computedItems.reduce((sum, i) => sum + i.lineTotal, 0));
  const discountAmount = discountPercent > 0 ? round2(subtotal * (discountPercent / 100)) : 0;
  const taxAmount = round2(computedItems.reduce((sum, i) => {
    const product = productMap.get(i.productId);
    const vatRate = product?.vatRate ?? 0;
    return sum + round2(i.lineTotal * (vatRate / 100));
  }, 0));
  const totalWithVat = round2(subtotal + taxAmount);
  const totalDiscount = round2(discountAmount + taxAmount);
  const grandTotal = round2(totalWithVat - totalDiscount);

  const itemsChanged = JSON.stringify(items) !== JSON.stringify(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  const discountChanged = discountPercent !== order.discountPercent;

  const filteredProducts = productCatalog.filter(
    (p) => !items.some((i) => i.productId === p.id) && p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  function handleQuantityChange(productId: string, quantity: number) {
    if (quantity < 1) {
      setItems(items.filter((i) => i.productId !== productId));
    } else {
      setItems(items.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    }
  }

  function handleRemoveItem(productId: string) {
    setItems(items.filter((i) => i.productId !== productId));
  }

  function handleAddItem(product: CatalogProduct) {
    setItems([...items, { productId: product.id, quantity: 1 }]);
    setProductPickerOpen(false);
    setProductSearch('');
  }

  async function handleSave() {
    setError('');
    const payload: Record<string, unknown> = {};
    if (tableId !== (order.tableId || '')) payload.tableId = tableId || null;
    if (itemsChanged) payload.items = items;
    if (discountPercent !== order.discountPercent) {
      payload.discountPercent = discountPercent;
    }
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: order.id, ...payload });
      onSaved();
    } catch {
      setError('Failed to update order');
    }
  }

  const hasChanges =
    tableId !== (order.tableId || '') ||
    itemsChanged ||
    discountChanged;

  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${order.orderNumber}`} size="lg">
      <div className="space-y-5">
        {/* Table */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Table</label>
          <div className="relative">
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="flex h-10 w-full appearance-none rounded-xl border border-input bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="">No table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tableNumber}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Items</h3>
            <Button variant="primary" size="sm" onClick={() => setProductPickerOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Add Item
            </Button>
          </div>

          {computedItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <p className="text-sm text-slate-400">No items in this order.</p>
              <p className="mt-1 text-xs text-slate-400">Add at least one item to save changes.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {computedItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatBdt(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="flex h-7 w-8 items-center justify-center text-sm font-semibold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="hidden w-20 text-right text-sm font-semibold text-slate-800 xs:block">{formatBdt(item.lineTotal)}</p>
                  <button onClick={() => handleRemoveItem(item.productId)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {computedItems.length > 0 && (
            <div className="mt-2.5 space-y-0.5 border-t border-border pt-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-800">{formatBdt(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VAT</span>
                  <span className="text-slate-800">{formatBdt(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold">
                <span>Subtotal + VAT</span>
                <span>{formatBdt(totalWithVat)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-green-600">Discount ({discountPercent}%)</span>
                  <span className="text-green-600">-{formatBdt(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
                <span>Grand Total</span>
                <span>{formatBdt(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Discount */}
        <div>
          <h3 className="mb-2.5 text-sm font-bold text-slate-800">Discount</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Discount (%)</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-green-600">
                {discountAmount > 0 ? `-${formatBdt(discountAmount)}` : formatBdt(0)}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-2 pt-4">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={updateMutation.isPending || items.length === 0 || !hasChanges}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="secondary" size="md" onClick={onClose} disabled={updateMutation.isPending}>
          Cancel
        </Button>
      </div>

      {/* Product Picker Dialog */}
      <Dialog
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        title="Add Item"
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {catalogFailed ? (
              <p className="py-4 text-center text-sm text-red-500">Failed to load product catalog</p>
            ) : filteredProducts.length === 0 && productCatalog.length === 0 ? (
              <p className="py-4 text-center text-sm font-medium text-slate-500">No products found. Create products first in the Products section.</p>
            ) : filteredProducts.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">All available products are already in this order.</p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddItem(product)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-100"
                >
                  <span className="text-sm font-medium text-slate-800">{product.name}</span>
                  <span className="text-xs text-slate-500">{formatBdt(product.price)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}

function formatBdt(n: number): string {
  return `\u09F3${n.toFixed(2)}`;
}
