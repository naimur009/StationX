'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import ProductList from '@/features/products/components/ProductList';
import ProductForm from '@/features/products/components/ProductForm';
import DeleteProductDialog from '@/features/products/components/DeleteProductDialog';
import type { ProductResponse } from '@/features/products/api';

export default function ProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductResponse | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductResponse | null>(null);
  const [permanentDeleteProduct, setPermanentDeleteProduct] = useState<ProductResponse | null>(null);

  return (
    <PermissionGate module="products" action="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Products</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your menu items
            </p>
          </div>
          <PermissionGate module="products" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Create Product
            </Button>
          </PermissionGate>
        </div>

        <ProductList
          onEdit={(product) => setEditProduct(product)}
          onDelete={(product) => setDeleteProduct(product)}
          onPermanentDelete={(product) => setPermanentDeleteProduct(product)}
        />

        <ProductForm
          open={createOpen}
          product={null}
          onClose={() => setCreateOpen(false)}
        />
        <ProductForm
          open={!!editProduct}
          product={editProduct}
          onClose={() => setEditProduct(null)}
        />
        <DeleteProductDialog
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
        />
        <DeleteProductDialog
          product={permanentDeleteProduct}
          permanent
          onClose={() => setPermanentDeleteProduct(null)}
        />
      </div>
    </PermissionGate>
  );
}
