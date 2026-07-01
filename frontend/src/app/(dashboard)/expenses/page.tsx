'use client';

import { useState } from 'react';
import { ArrowUpDown, DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import ExpenseList from '@/features/expenses/components/ExpenseList';
import ExpenseForm from '@/features/expenses/components/ExpenseForm';
import DeleteExpenseDialog from './DeleteExpenseDialog';
import SalaryList from '@/features/salaries/components/SalaryList';
import SalaryForm from '@/features/salaries/components/SalaryForm';
import AddAdvanceDialog from '@/features/salaries/components/AddAdvanceDialog';
import SalaryDetailDialog from '@/features/salaries/components/SalaryDetailDialog';
import DeleteSalaryDialog from '@/features/salaries/components/DeleteSalaryDialog';
import type { ExpenseResponse } from '@/features/expenses/api';
import type { SalaryResponse } from '@/features/salaries/api';

type ActiveTab = 'expenses' | 'salaries';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');

  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseResponse | null>(null);

  const [advanceSalary, setAdvanceSalary] = useState<SalaryResponse | null>(null);
  const [detailSalaryId, setDetailSalaryId] = useState<string | null>(null);
  const [deleteSalary, setDeleteSalary] = useState<SalaryResponse | null>(null);
  const [payEmployeeId, setPayEmployeeId] = useState<string | null>(null);

  return (
    <PermissionGate module="expenses" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Expenses</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track business expenses and manage employee salaries
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'expenses' && (
              <PermissionGate module="expenses" action="create">
                <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Expense
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpDown className="h-4 w-4" />
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('salaries')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'salaries'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Salaries
          </button>
        </div>

        {activeTab === 'expenses' ? (
          <>
            <ExpenseList
              onEdit={(expense) => setEditExpense(expense)}
              onDelete={(expense) => setDeleteExpense(expense)}
            />

            <ExpenseForm
              open={createOpen}
              expense={null}
              onClose={() => setCreateOpen(false)}
            />
            <ExpenseForm
              open={!!editExpense}
              expense={editExpense}
              onClose={() => setEditExpense(null)}
            />
            <DeleteExpenseDialog
              expense={deleteExpense}
              onClose={() => setDeleteExpense(null)}
            />
          </>
        ) : (
          <>
            <SalaryList
              onAddAdvance={(salary) => setAdvanceSalary(salary)}
              onViewDetail={(salary) => setDetailSalaryId(salary.id)}
              onDelete={(salary) => setDeleteSalary(salary)}
              onPay={(employeeId) => setPayEmployeeId(employeeId)}
            />
            <AddAdvanceDialog
              open={!!advanceSalary}
              salary={advanceSalary}
              onClose={() => setAdvanceSalary(null)}
            />
            <SalaryDetailDialog
              open={!!detailSalaryId}
              salaryId={detailSalaryId}
              onClose={() => setDetailSalaryId(null)}
            />
            <DeleteSalaryDialog
              salary={deleteSalary}
              onClose={() => setDeleteSalary(null)}
            />
            <SalaryForm
              open={!!payEmployeeId}
              preSelectedEmployeeId={payEmployeeId ?? undefined}
              onClose={() => setPayEmployeeId(null)}
            />
          </>
        )}
      </div>
    </PermissionGate>
  );
}
