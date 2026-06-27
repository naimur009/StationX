'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PermissionGate from '@/components/shared/PermissionGate';
import ExpenseDetail from '@/features/expenses/components/ExpenseDetail';
import ExpenseForm from '@/features/expenses/components/ExpenseForm';
import type { ExpenseResponse } from '@/features/expenses/api';

export default function ExpenseDetailPage() {
  const params = useParams();
  const expenseId = params.expenseId as string;
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);

  return (
    <PermissionGate module="expenses" action="view">
      <ExpenseDetail
        expenseId={expenseId}
        onEdit={(expense) => setEditExpense(expense)}
      />
      <ExpenseForm
        open={!!editExpense}
        expense={editExpense}
        onClose={() => setEditExpense(null)}
      />
    </PermissionGate>
  );
}
