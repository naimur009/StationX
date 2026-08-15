'use client';

import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EmployeeMonthData } from '../api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthDetailDialogProps {
  open: boolean;
  month: EmployeeMonthData | null;
  employeeName: string;
  year: number;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status: string): { variant: 'green' | 'yellow' | 'red' | 'slate'; label: string } {
  switch (status) {
    case 'paid':
      return { variant: 'green', label: 'Paid' };
    case 'active':
      return { variant: 'yellow', label: 'Partial' };
    case 'cancelled':
      return { variant: 'red', label: 'Cancelled' };
    case 'no_salary':
      return { variant: 'slate', label: 'No Salary' };
    default:
      return { variant: 'red', label: status.charAt(0).toUpperCase() + status.slice(1) };
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MonthDetailDialog({ open, month, employeeName, year, onClose }: MonthDetailDialogProps) {
  if (!month) return null;

  const badge = statusBadge(month.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${MONTHS[month.month - 1]} ${year}`}
      size="md"
      footer={
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{employeeName || 'Employee'}</p>
            <p className="text-lg font-bold text-slate-800">{MONTHS[month.month - 1]} {year}</p>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-500">Net Salary</span>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(month.netSalary)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Paid</span>
              <p className="text-lg font-bold text-green-600">{formatCurrency(month.totalPaid)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Remaining</span>
              <p className={`text-lg font-bold ${month.remainingBalance > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                {formatCurrency(month.remainingBalance)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Base Salary</span>
              <span className="font-semibold text-slate-800">{formatCurrency(month.baseSalary)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Bonus</span>
              <span className="font-semibold text-green-600">{month.totalBonus > 0 ? `+${formatCurrency(month.totalBonus)}` : formatCurrency(month.totalBonus)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Deductions</span>
              <span className="font-semibold text-red-500">{month.totalCut > 0 ? `-${formatCurrency(month.totalCut)}` : formatCurrency(month.totalCut)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-700">Net Salary</span>
              <span className="font-bold text-slate-900">{formatCurrency(month.netSalary)}</span>
            </div>
          </div>
        </div>

        {month.status === 'paid' && month.paidAt && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Paid on {formatDate(month.paidAt)}
          </div>
        )}

        {month.adjustments.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Adjustments</h3>
            <div className="space-y-2">
              {month.adjustments.map((adj) => (
                <div
                  key={adj.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    adj.type === 'bonus' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${adj.type === 'bonus' ? 'text-green-600' : 'text-red-500'}`}>
                        {adj.type === 'bonus' ? '+' : '-'}{formatCurrency(adj.amount)}
                      </span>
                      <Badge variant={adj.type === 'bonus' ? 'green' : 'red'}>
                        {adj.type === 'bonus' ? 'Bonus' : 'Cut'}
                      </Badge>
                      <span className="text-xs text-slate-400">{formatDate(adj.date)}</span>
                    </div>
                    {adj.reason && <p className="mt-0.5 text-xs text-slate-500">{adj.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No bonuses or deductions recorded for this month
          </div>
        )}
      </div>
    </Dialog>
  );
}
