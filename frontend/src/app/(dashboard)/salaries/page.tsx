'use client';

import { useState } from 'react';
import { List, BarChart3 } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';
import SalaryList from '@/features/salaries/components/SalaryList';
import SalaryReport from '@/features/salaries/components/SalaryReport';
import AddAdvanceDialog from '@/features/salaries/components/AddAdvanceDialog';
import SalaryDetailDialog from '@/features/salaries/components/SalaryDetailDialog';
import DeleteSalaryDialog from '@/features/salaries/components/DeleteSalaryDialog';
import SalaryAdjustmentDialog from '@/features/salaries/components/SalaryAdjustmentDialog';
import type { SalaryResponse } from '@/features/salaries/api';

type ActiveTab = 'list' | 'report';

interface PaymentDialogState {
  salary: SalaryResponse | null;
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  month: number;
  year: number;
}

export default function SalariesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState | null>(null);
  const [detailSalaryId, setDetailSalaryId] = useState<string | null>(null);
  const [deleteSalary, setDeleteSalary] = useState<SalaryResponse | null>(null);
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    type: 'bonus' | 'cut';
    employeeId: string;
    month: number;
    year: number;
  } | null>(null);

  return (
    <PermissionGate module="salary" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Salaries</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage employee salaries, bonuses, and deductions
            </p>
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="h-4 w-4" />
            Salary List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'report'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Report
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <SalaryList
              onAddAdvance={(salary) =>
                setPaymentDialog({
                  salary,
                  employeeId: salary.employeeId._id,
                  employeeName: salary.employeeId.name,
                  baseSalary: salary.baseSalary,
                  month: salary.month,
                  year: salary.year,
                })
              }
              onDelete={(salary) => setDeleteSalary(salary)}
              onAddPayment={({ employeeId, employeeName, baseSalary, month, year }) =>
                setPaymentDialog({ salary: null, employeeId, employeeName, baseSalary, month, year })
              }
              onViewDetail={(salary) => setDetailSalaryId(salary.id)}
              onAddBonus={(employeeId, month, year) => setAdjustmentDialog({ type: 'bonus', employeeId, month, year })}
              onAddCut={(employeeId, month, year) => setAdjustmentDialog({ type: 'cut', employeeId, month, year })}
            />
            <AddAdvanceDialog
              open={!!paymentDialog}
              salary={paymentDialog?.salary ?? null}
              employeeId={paymentDialog?.employeeId}
              employeeName={paymentDialog?.employeeName}
              baseSalary={paymentDialog?.baseSalary}
              month={paymentDialog?.month}
              year={paymentDialog?.year}
              onClose={() => setPaymentDialog(null)}
            />
            <SalaryDetailDialog
              open={!!detailSalaryId}
              salaryId={detailSalaryId}
              onClose={() => setDetailSalaryId(null)}
              onAddAdvance={(salary) =>
                setPaymentDialog({
                  salary,
                  employeeId: salary.employeeId._id,
                  employeeName: salary.employeeId.name,
                  baseSalary: salary.baseSalary,
                  month: salary.month,
                  year: salary.year,
                })
              }
            />
            <DeleteSalaryDialog
              salary={deleteSalary}
              onClose={() => setDeleteSalary(null)}
            />
            <SalaryAdjustmentDialog
              open={!!adjustmentDialog}
              defaultType={adjustmentDialog?.type}
              defaultEmployeeId={adjustmentDialog?.employeeId}
              defaultMonth={adjustmentDialog?.month}
              defaultYear={adjustmentDialog?.year}
              onClose={() => setAdjustmentDialog(null)}
            />
          </>
        )}

        {activeTab === 'report' && <SalaryReport />}
      </div>
    </PermissionGate>
  );
}