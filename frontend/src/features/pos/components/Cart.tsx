'use client';

import { usePosStore } from '../store';
import { Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';

export default function Cart() {
  const items = usePosStore((s) => s.items);
  const removeItem = usePosStore((s) => s.removeItem);
  const updateQuantity = usePosStore((s) => s.updateQuantity);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <ShoppingCart className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">Cart is empty</p>
        <p className="text-xs text-slate-400">Select products to begin</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.productId} className="flex items-center gap-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">{item.name}</p>
            <p className="text-[11px] text-slate-500">৳{item.price.toFixed(2)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex w-8 items-center justify-center text-sm font-semibold text-slate-800">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <p className="w-16 shrink-0 text-right text-[13px] font-semibold text-slate-800 sm:w-[4.5rem]">
            ৳{item.lineTotal.toFixed(2)}
          </p>

          <button
            onClick={() => removeItem(item.productId)}
            className="shrink-0 rounded-md p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}