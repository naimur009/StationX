'use client';

import { useState, useEffect } from 'react';
import { useSalary, useUpdateSalaryStatus, useDeleteSalary } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppError } from '@/lib/utils';

interface SalaryDetailDialogProps {
  open: boolean;
  salaryId: string | null;
  onClose: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SalaryDetailDialog({ open, salaryId, onClose }: SalaryDetailDialogProps) {
  const { data: response, isLoading, isError } = useSalary(salaryId ?? '');
  const updateStatus = useUpdateSalaryStatus();
  const deleteSalary = useDeleteSalary();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const salary = response?.data ?? null;

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

  async function handleMarkAsPaid() {
    if (!salary) return;
    setStatusMessage(null);
    try {
      await updateStatus.mutateAsync({ salaryId: salary.id, status: 'paid' });
      setStatusMessage({ type: 'success', text: 'Salary marked as paid' });
    } catch (err) {
      if (err instanceof AppError) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to update status' });
      }
    }
  }

  async function handleDelete() {
    if (!salary) return;
    if (!confirm(`Delete salary record for ${salary.employeeId?.name ?? 'this employee'}? This cannot be undone.`)) return;
    setStatusMessage(null);
    try {
      await deleteSalary.mutateAsync(salary.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete salary record' });
      }
    }
  }

  useEffect(() => {
    if (open) {
      setStatusMessage(null);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Salary Details"
      size="lg"
      footer={
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
      ) : isError ? (
        <div className="py-8 text-center text-sm text-red-500">Failed to load salary details</div>
      ) : !salary ? (
        <div className="py-8 text-center text-sm text-slate-400">Salary record not found</div>
      ) : (
        <div className="space-y-5">
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
                <p className="text-lg font-bold text-slate-800">{formatCurrency(salary.baseSalary)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Total Paid</span>
                <p className="text-lg font-bold text-green-600">{formatCurrency(salary.totalPaid)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Remaining</span>
                <p className={`text-lg font-bold ${salary.remainingBalance > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {formatCurrency(salary.remainingBalance)}
                </p>
              </div>
            </div>
            {salary.status === 'active' && salary.remainingBalance === 0 && (
              <div className="mt-4">
                <Button variant="success" size="sm" onClick={handleMarkAsPaid} disabled={updateStatus.isPending}>
                  {updateStatus.isPending ? 'Updating...' : 'Mark as Paid'}
                </Button>
              </div>
            )}
            {salary.advances.length === 0 && (
              <div className="mt-4">
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteSalary.isPending}>
                  {deleteSalary.isPending ? 'Deleting...' : 'Delete Salary'}
                </Button>
              </div>
            )}
          </div>

          {salary.advances.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Advance History</h3>
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
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No advances recorded yet
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
