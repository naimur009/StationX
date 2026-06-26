'use client';

import { usePosStore } from '../store';
import { Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';

export default function Cart() {
  const items = usePosStore((s) => s.items);
  const removeItem = usePosStore((s) => s.removeItem);
  const updateQuantity = usePosStore((s) => s.updateQuantity);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ShoppingCart className="mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm font-medium text-slate-400">Cart is empty</p>
        <p className="text-xs text-slate-300">Select products to begin</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.productId}
          className="flex items-center gap-3 rounded-xl border border-border bg-white p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">BDT {item.price.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex h-7 w-8 items-center justify-center text-sm font-semibold text-slate-800">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <p className="w-20 text-right text-sm font-semibold text-slate-800">
            BDT {item.lineTotal.toFixed(2)}
          </p>
          <button
            onClick={() => removeItem(item.productId)}
            className="text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
