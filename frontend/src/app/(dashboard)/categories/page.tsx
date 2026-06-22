'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import CategoryList from '@/features/categories/components/CategoryList';
import CategoryForm from '@/features/categories/components/CategoryForm';
import DeleteCategoryDialog from '@/features/categories/components/DeleteCategoryDialog';
import type { CategoryResponse } from '@/features/categories/api';

export default function CategoriesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryResponse | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<CategoryResponse | null>(null);
  const [permanentDeleteCategory, setPermanentDeleteCategory] = useState<CategoryResponse | null>(null);

  return (
    <PermissionGate module="categories" action="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage product categories
            </p>
          </div>
          <PermissionGate module="categories" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Create Category
            </Button>
          </PermissionGate>
        </div>

        <CategoryList
          onEdit={(category) => setEditCategory(category)}
          onDelete={(category) => setDeleteCategory(category)}
          onPermanentDelete={(category) => setPermanentDeleteCategory(category)}
        />

        <CategoryForm
          open={createOpen}
          category={null}
          onClose={() => setCreateOpen(false)}
        />
        <CategoryForm
          open={!!editCategory}
          category={editCategory}
          onClose={() => setEditCategory(null)}
        />
        <DeleteCategoryDialog
          category={deleteCategory}
          onClose={() => setDeleteCategory(null)}
        />
        <DeleteCategoryDialog
          category={permanentDeleteCategory}
          permanent
          onClose={() => setPermanentDeleteCategory(null)}
        />
      </div>
    </PermissionGate>
  );
}
