'use client';

import { useState } from 'react';
import { List, BarChart3, Gift, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import SalaryList from '@/features/salaries/components/SalaryList';
import SalaryReport from '@/features/salaries/components/SalaryReport';
import SalaryForm from '@/features/salaries/components/SalaryForm';
import AddAdvanceDialog from '@/features/salaries/components/AddAdvanceDialog';
import SalaryDetailDialog from '@/features/salaries/components/SalaryDetailDialog';
import DeleteSalaryDialog from '@/features/salaries/components/DeleteSalaryDialog';
import SalaryAdjustmentDialog from '@/features/salaries/components/SalaryAdjustmentDialog';
import type { SalaryResponse } from '@/features/salaries/api';

type ActiveTab = 'list' | 'report';

export default function SalariesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [advanceSalary, setAdvanceSalary] = useState<SalaryResponse | null>(null);
  const [detailSalaryId, setDetailSalaryId] = useState<string | null>(null);
  const [deleteSalary, setDeleteSalary] = useState<SalaryResponse | null>(null);
  const [payEmployeeId, setPayEmployeeId] = useState<string | null>(null);
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    type: 'bonus' | 'cut';
    employeeId: string;
    month: number;
    year: number;
  } | null>(null);

  return (
    <PermissionGate module="salary" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Salaries</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage employee salaries, bonuses, and deductions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate module="salary" action="create">
              <Button variant="success" size="sm" onClick={() => setAdjustmentDialog({ type: 'bonus', employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })}>
                <Gift className="mr-1.5 h-4 w-4" />
                Add Bonus
              </Button>
            </PermissionGate>
            <PermissionGate module="salary" action="create">
              <Button variant="destructive" size="sm" onClick={() => setAdjustmentDialog({ type: 'cut', employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })}>
                <ArrowUpDown className="mr-1.5 h-4 w-4" />
                Add Cut
              </Button>
            </PermissionGate>
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
              onAddAdvance={(salary) => setAdvanceSalary(salary)}
              onViewDetail={(salary) => setDetailSalaryId(salary.id)}
              onDelete={(salary) => setDeleteSalary(salary)}
              onPay={(employeeId) => setPayEmployeeId(employeeId)}
              onAddBonus={(employeeId, month, year) => setAdjustmentDialog({ type: 'bonus', employeeId, month, year })}
              onAddCut={(employeeId, month, year) => setAdjustmentDialog({ type: 'cut', employeeId, month, year })}
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