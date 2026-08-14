'use client';

import { useState } from 'react';
import { useCatalog } from '../api';
import { usePosStore } from '../store';
import type { CatalogProduct } from '../api';
import { Input } from '@/components/ui/input';
import { Plus, Search, ShoppingBag } from 'lucide-react';

const ALL = '__all__';

export default function ProductGrid() {
  const { data, isLoading } = useCatalog();
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const addItem = usePosStore((s) => s.addItem);
  const items = usePosStore((s) => s.items);

  const products: CatalogProduct[] = data?.data ?? [];

  const categories = Array.from(new Set(products.filter((p) => p.category).map((p) => p.category!))).sort();

  const filtered = products.filter((p) => {
    if (category !== ALL && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const quantityOf = (productId: string) => items.find((i) => i.productId === productId)?.quantity ?? 0;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 lg:py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 spinner-smooth" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-4">
      <div className="sticky top-16 z-10 -mx-3 space-y-3 bg-background/95 px-3 pb-2 pt-1 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setCategory(ALL)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              category === ALL
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xs:grid-cols-2 sm:grid-cols-3 md:gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:content-start lg:overflow-y-auto lg:pr-1 xl:grid-cols-4 2xl:grid-cols-5">
        {filtered.map((product) => {
          const qty = quantityOf(product.id);
          return (
            <button
              key={product.id}
              onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, vatRate: product.vatRate })}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.97]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                <img
                  src={product.image?.url || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image'}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {product.category && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
                    {product.category}
                  </span>
                )}
                {qty > 0 && (
                  <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow-sm">
                    {qty}
                  </span>
                )}
                <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 group-active:opacity-100">
                  <Plus className="h-4 w-4" />
                </span>
              </div>

              <div className="flex flex-col gap-1 px-3 py-2.5">
                <span className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800 group-hover:text-primary">
                  {product.name}
                </span>
                <span className="text-sm font-bold text-primary">
                  BDT {product.price.toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <ShoppingBag className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No products found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}