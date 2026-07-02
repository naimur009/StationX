'use client';

import { useState } from 'react';
import { useCatalog } from '../api';
import { usePosStore } from '../store';
import type { CatalogProduct } from '../api';
import { Input } from '@/components/ui/input';
import { Search, ShoppingBag } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategory(ALL)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            category === ALL
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xs:grid-cols-2 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {filtered.map((product) => (
          <button
            key={product.id}
            onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, taxRate: product.taxRate })}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md active:scale-[0.97]"
          >
            <div className="relative aspect-square overflow-hidden bg-slate-50">
              {product.image ? (
                <img
                  src={product.image.url}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100">
                  <ShoppingBag className="h-10 w-10 text-slate-300" />
                </div>
              )}
              {product.category && (
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
                  {product.category}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800 group-hover:text-primary">
                {product.name}
              </span>
              <span className="text-xs font-bold text-primary">
                BDT {product.price.toFixed(2)}
              </span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">No products found</p>
            <p className="text-xs text-slate-300">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
