'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useUpdateOrder } from '../api';
import type { OrderDetail, OrderItemUpdate } from '../api';
import { Trash2, Plus, Minus, Search } from 'lucide-react';

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface OrderEditFormProps {
  order: OrderDetail;
  onCancel: () => void;
  onSaved: () => void;
}

export default function OrderEditForm({ order, onCancel, onSaved }: OrderEditFormProps) {
  const [tableNumber, setTableNumber] = useState(order.tableNumber || '');
  const [items, setItems] = useState<OrderItemUpdate[]>(
    order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
  );
  const [paymentMethod, setPaymentMethod] = useState(order.payment.method);
  const [productCatalog, setProductCatalog] = useState<CatalogProduct[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [error, setError] = useState('');

  const updateMutation = useUpdateOrder();

  useEffect(() => {
    apiClient<{ data: unknown }>('/pos/catalog').then((res) => {
      if (Array.isArray(res.data)) {
        setProductCatalog(res.data as CatalogProduct[]);
      } else {
        setCatalogError('Catalog data is not in expected format');
      }
    }).catch(() => {
      setCatalogError('Failed to load product catalog');
    });
  }, []);

  const productMap = new Map(productCatalog.map((p) => [p.id, p]));

  const computedItems = items.map((item) => {
    const product = productMap.get(item.productId);
    const price = product?.price ?? 0;
    return { ...item, name: product?.name || 'Unknown', price, lineTotal: round2(price * item.quantity) };
  });

  const subtotal = round2(computedItems.reduce((sum, i) => sum + i.lineTotal, 0));
  const discountAmount = order.couponId
    ? round2(subtotal * (order.discountAmount / (order.subtotal || 1)))
    : 0;
  const grandTotal = round2(subtotal - discountAmount);

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
    if (tableNumber !== order.tableNumber) payload.tableNumber = tableNumber || undefined;
    if (JSON.stringify(items) !== JSON.stringify(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))) {
      payload.items = items;
    }
    const paymentChanged =
      paymentMethod !== order.payment.method;
    if (paymentChanged) {
      payload.payment = {
        method: paymentMethod,
      };
    }
    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: order.id, ...payload });
      onSaved();
    } catch {
      setError('Failed to update order');
    }
  }

  return (
    <div className="space-y-5">
      {/* Table Number */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Table Number</label>
          <Input
            placeholder="e.g. 12"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Items Editor */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Items</h3>
          <Button variant="secondary" size="sm" onClick={() => setProductPickerOpen(true)}>
            <Plus className="mr-1 h-3 w-3" /> Add Item
          </Button>
        </div>

        {computedItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No items. Add at least one item.</p>
        ) : (
          <div className="space-y-2">
            {computedItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">BDT {item.price.toFixed(2)}</p>
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
                <p className="w-20 text-right text-sm font-semibold text-slate-800">BDT {item.lineTotal.toFixed(2)}</p>
                <button onClick={() => handleRemoveItem(item.productId)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {computedItems.length > 0 && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>BDT {subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-BDT {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold text-slate-800">
              <span>Grand Total</span>
              <span>BDT {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Section */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-800">Payment</h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {['cash', 'card', 'bkash', 'nagad'].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  paymentMethod === method
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button variant="primary" size="md" onClick={handleSave} disabled={updateMutation.isPending || items.length === 0}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="secondary" size="md" onClick={onCancel} disabled={updateMutation.isPending}>
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
            {catalogError ? (
              <p className="py-4 text-center text-sm text-red-500">{catalogError}</p>
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
                  <span className="text-xs text-slate-500">BDT {product.price.toFixed(2)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
