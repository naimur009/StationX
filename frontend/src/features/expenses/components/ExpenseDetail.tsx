'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User, Building2, CreditCard, FileText } from 'lucide-react';
import { useExpense, useDeleteExpense, type ExpenseResponse } from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import { Dialog } from '@/components/ui/dialog';
import { AppError } from '@/lib/utils';

interface ExpenseDetailProps {
  expenseId: string;
  onEdit: (expense: ExpenseResponse) => void;
}

export default function ExpenseDetail({ expenseId, onEdit }: ExpenseDetailProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteExpense = useDeleteExpense();

  const { data, isLoading, isError } = useExpense(expenseId);

  const expense = data?.data;

  async function handleDelete() {
    if (!expense) return;
    setDeleteError(null);

    try {
      await deleteExpense.mutateAsync(expense.id);
      setDeleteOpen(false);
      router.push('/expenses');
    } catch (err) {
      if (err instanceof AppError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete expense');
      }
    }
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const local = new Date(y, m - 1, d);
    return local.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    bkash: 'bKash',
    nagad: 'Nagad',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
        <p className="text-sm text-red-600">
          {isError ? 'Failed to load expense details.' : 'Expense not found.'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push('/expenses')}
        >
          Back to Expenses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push('/expenses')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Expenses
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                {formatCurrency(expense.amount)}
              </h1>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="blue">{expense.category}</Badge>
                <span className="text-sm text-slate-500">{formatDate(expense.date)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate module="expenses" action="edit">
              <Button variant="primary" size="md" onClick={() => onEdit(expense)}>
                Edit Expense
              </Button>
            </PermissionGate>
            <PermissionGate module="expenses" action="delete">
              <Button
                variant="destructive"
                size="md"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                Delete
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">Description</h2>
        <p className="text-sm text-slate-700 leading-relaxed">{expense.description}</p>
      </div>

      {/* Payment details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">Payment Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Paid To</p>
              <p className="truncate text-sm text-slate-700">{expense.paidTo}</p>
            </div>
          </div>

          {expense.vendorId && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Building2 className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Vendor</p>
                <button
                  onClick={() => router.push(`/vendors/${expense.vendorId!._id}`)}
                  className="truncate text-sm text-blue-600 hover:underline"
                >
                  {expense.vendorId.name}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <CreditCard className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Payment Method</p>
              <p className="truncate text-sm text-slate-700">
                {paymentMethodLabels[expense.paymentMethod] ?? expense.paymentMethod}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Paid By</p>
              <p className="truncate text-sm text-slate-700">
                {expense.paidBy?.name ?? 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">Details</h2>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Calendar className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Created By</p>
            <p className="text-sm text-slate-700">{expense.createdBy.name}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">Created At</p>
            <p className="text-sm text-slate-700">{formatDateTime(expense.createdAt)}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">Last Updated</p>
            <p className="text-sm text-slate-700">{formatDateTime(expense.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        title="Delete Expense"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => { setDeleteOpen(false); setDeleteError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? 'Deleting\u2026' : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {deleteError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete this expense of{' '}
            <span className="font-semibold text-slate-800">{formatCurrency(expense.amount)}</span> from{' '}
            <span className="font-semibold text-slate-800">{formatDate(expense.date)}</span>? This action
            cannot be undone.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
