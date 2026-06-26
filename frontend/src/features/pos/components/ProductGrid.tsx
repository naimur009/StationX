'use client';

import { useState } from 'react';
import { useCatalog } from '../api';
import { usePosStore } from '../store';
import type { CatalogProduct } from '../api';
import { Input } from '@/components/ui/input';

const ALL = '__all__';

export default function ProductGrid() {
  const { data, isLoading } = useCatalog();
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const addItem = usePosStore((s) => s.addItem);

  const products: CatalogProduct[] = data?.data ?? [];

  const categories = Array.from(new Set(products.filter((p) => p.category).map((p) => p.category!))).sort();

  const filtered = products.filter((p) => {
    if (category !== ALL && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(ALL)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === ALL
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <button
            key={product.id}
            onClick={() => addItem({ productId: product.id, name: product.name, price: product.price })}
            className="group flex flex-col items-center rounded-2xl border border-border bg-white p-4 text-center shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            {product.image ? (
              <img
                src={product.image.url}
                alt={product.name}
                className="mb-3 h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-3xl text-slate-300">
                🍽
              </div>
            )}
            <span className="text-sm font-semibold text-slate-800 group-hover:text-primary">
              {product.name}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500">
              BDT {product.price.toFixed(2)}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-slate-400">
            No products found
          </p>
        )}
      </div>
    </div>
  );
}
