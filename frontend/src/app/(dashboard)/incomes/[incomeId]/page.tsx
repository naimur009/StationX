'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PermissionGate from '@/components/shared/PermissionGate';
import IncomeDetail from '@/features/incomes/components/IncomeDetail';
import IncomeForm from '@/features/incomes/components/IncomeForm';
import type { IncomeResponse } from '@/features/incomes/api';

export default function IncomeDetailPage() {
  const params = useParams();
  const incomeId = params.incomeId as string;
  const [editIncome, setEditIncome] = useState<IncomeResponse | null>(null);

  return (
    <PermissionGate module="incomes" action="view">
      <IncomeDetail
        incomeId={incomeId}
        onEdit={(income) => setEditIncome(income)}
      />
      <IncomeForm
        open={!!editIncome}
        income={editIncome}
        onClose={() => setEditIncome(null)}
      />
    </PermissionGate>
  );
}
