'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSalary, useDeleteSalary, useAdjustmentsList, useDeleteAdjustment, type AdjustmentResponse, type SalaryResponse } from '../api';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PermissionGate from '@/components/shared/PermissionGate';
import { AppError } from '@/lib/utils';
import SalaryAdjustmentDialog from './SalaryAdjustmentDialog';

interface SalaryDetailDialogProps {
  open: boolean;
  salaryId: string | null;
  onClose: () => void;
  onAddAdvance?: (salary: SalaryResponse) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SalaryDetailDialog({ open, salaryId, onClose, onAddAdvance }: SalaryDetailDialogProps) {
  const { data: response, isLoading, isError } = useSalary(salaryId ?? '');
  const deleteSalary = useDeleteSalary();
  const deleteAdjustment = useDeleteAdjustment();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<AdjustmentResponse | null>(null);

  const salary = response?.data ?? null;

  const { data: adjustmentsData, refetch: refetchAdjustments } = useAdjustmentsList({
    employeeId: salary?.employeeId?._id,
    month: salary?.month,
    year: salary?.year,
    limit: 100,
  }, salaryId != null && salary?.employeeId?._id != null && salary?.month != null && salary?.year != null);

  const adjustments = useMemo(() => adjustmentsData?.data ?? [], [adjustmentsData]);

  const totalBonus = useMemo(
    () => adjustments.filter((a) => a.type === 'bonus').reduce((sum, a) => sum + a.amount, 0),
    [adjustments]
  );

  const totalCut = useMemo(
    () => adjustments.filter((a) => a.type === 'cut').reduce((sum, a) => sum + a.amount, 0),
    [adjustments]
  );

  const netSalary = (salary?.baseSalary ?? 0) + totalBonus - totalCut;

  function formatCurrency(amount: number): string {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const statusBadge: Record<string, 'green' | 'yellow' | 'red' | 'slate'> = {
    paid: 'green',
    active: 'yellow',
    cancelled: 'red',
  };

  async function handleDelete() {
    if (!salary) return;
    if (!confirm(`Delete salary record for ${salary.employeeId?.name ?? 'this employee'}? This cannot be undone.`)) return;
    setStatusMessage(null);
    try {
      await deleteSalary.mutateAsync({ id: salary.id });
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete salary record' });
      }
    }
  }

  async function handleDeleteAdjustment(adjustmentId: string) {
    if (!confirm('Delete this adjustment? This cannot be undone.')) return;
    setStatusMessage(null);
    try {
      await deleteAdjustment.mutateAsync(adjustmentId);
      setStatusMessage({ type: 'success', text: 'Adjustment deleted' });
      refetchAdjustments();
    } catch (err) {
      if (err instanceof AppError) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete adjustment' });
      }
    }
  }

  useEffect(() => {
    if (open) {
      setStatusMessage(null);
    }
  }, [open]);

  const remaining = salary ? Math.max(0, salary.remainingBalance) : 0;
  const isFullyPaid = salary?.status === 'paid';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Salary Details"
      footer={
        <>
          {onAddAdvance && !isFullyPaid && (
            <PermissionGate module="salary" action="edit">
              <Button type="button" variant="success" size="md" onClick={() => salary && onAddAdvance(salary)}>
                Payment
              </Button>
            </PermissionGate>
          )}
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-sm text-red-500">Failed to load salary details</div>
      ) : !salary ? (
        <div className="py-8 text-center text-sm text-slate-400">Salary record not found</div>
      ) : (
        <div className="space-y-6">
          {statusMessage && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'border-green-100 bg-green-50 text-green-700'
                  : 'border-red-100 bg-red-50 text-red-700'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-xs text-slate-500">Employee</span>
                <p className="font-semibold text-slate-800">{salary.employeeId?.name ?? 'Unknown'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Period</span>
                <p className="font-semibold text-slate-800">
                  {MONTHS[salary.month - 1]} {salary.year}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Status</span>
                <p><Badge variant={statusBadge[salary.status] ?? 'slate'}>{salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}</Badge></p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Advances</span>
                <p className="font-semibold text-slate-800">{salary.advances.length}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
              <div>
                <span className="text-xs text-slate-500">Base Salary</span>
                <p className="mt-0.5 text-lg font-bold text-slate-800">{formatCurrency(salary.baseSalary)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Paid</span>
                <p className="mt-0.5 text-lg font-bold text-green-600">{formatCurrency(salary.totalPaid)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Remaining</span>
                <p className={`mt-0.5 text-lg font-bold ${remaining > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </div>

          {/* Salary breakdown */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Salary Breakdown</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-500">Base Salary</span>
                <span className="font-semibold text-slate-800">{formatCurrency(salary.baseSalary)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-500">Bonus</span>
                <span className="font-semibold text-green-600">
                  {totalBonus > 0 ? `+${formatCurrency(totalBonus)}` : formatCurrency(totalBonus)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-500">Deductions</span>
                <span className="font-semibold text-red-500">
                  {totalCut > 0 ? `-${formatCurrency(totalCut)}` : formatCurrency(totalCut)}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-700">Net Salary</span>
                <span className="font-bold text-slate-900">{formatCurrency(netSalary)}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onAddAdvance && !isFullyPaid && (
                <PermissionGate module="salary" action="edit">
                  <Button variant="outline" size="sm" onClick={() => onAddAdvance(salary)}>
                    Payments
                  </Button>
                </PermissionGate>
              )}
              {salary.advances.length === 0 && (
                <PermissionGate module="salary" action="delete">
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteSalary.isPending}>
                    {deleteSalary.isPending ? 'Deleting...' : 'Delete Salary'}
                  </Button>
                </PermissionGate>
              )}
            </div>
          </div>

          {/* Payment history */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Payment History
              {salary.advances.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {salary.advances.length}
                </span>
              )}
            </h3>
            {salary.advances.length > 0 ? (
              <div className="space-y-2">
                {salary.advances.map((advance) => (
                  <div
                    key={advance._id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          +{formatCurrency(advance.amount)}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(advance.date)}</span>
                      </div>
                      {advance.note && (
                        <p className="mt-0.5 text-xs text-slate-500">{advance.note}</p>
                      )}
                      {advance.createdBy && (
                        <p className="mt-0.5 text-xs text-slate-400">Recorded by {advance.createdBy.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                No payments recorded yet
              </div>
            )}
          </div>

          {adjustments.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Adjustments <span className="text-xs font-normal text-slate-400">(Bonuses &amp; Cuts)</span>
              </h3>
              <div className="space-y-2">
                {adjustments.map((adj) => (
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
                      <p className="mt-0.5 text-xs text-slate-500">{adj.reason}</p>
                      {adj.createdBy && (
                        <p className="mt-0.5 text-xs text-slate-400">Recorded by {adj.createdBy.name}</p>
                      )}
                    </div>
                    <PermissionGate module="salary" action="edit">
                      <button
                        onClick={() => setEditingAdjustment(adj)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                        title="Edit adjustment"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </PermissionGate>
                    <PermissionGate module="salary" action="delete">
                      <button
                        onClick={() => handleDeleteAdjustment(adj.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                        title="Delete adjustment"
                        disabled={deleteAdjustment.isPending}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No bonuses or cuts recorded for this period
            </div>
          )}
        </div>
      )}
      <SalaryAdjustmentDialog
        open={!!editingAdjustment}
        editAdjustment={editingAdjustment}
        onClose={() => { setEditingAdjustment(null); refetchAdjustments(); }}
      />
    </Drawer>
  );
}
