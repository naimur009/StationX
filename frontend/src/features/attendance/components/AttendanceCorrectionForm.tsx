'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, User, Calendar, FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAttendanceDetail, useUpdateAttendance } from '../api';
import { AppError } from '@/lib/utils';

interface AttendanceCorrectionFormProps {
  recordId: string | null;
  onClose: () => void;
}

export default function AttendanceCorrectionForm({ recordId, onClose }: AttendanceCorrectionFormProps) {
  const { data, isLoading: detailLoading } = useAttendanceDetail(recordId || '');
  const updateMutation = useUpdateAttendance();
  const record = data?.data;

  const [status, setStatus] = useState('');
  const [checkInAt, setCheckInAt] = useState('');
  const [checkOutAt, setCheckOutAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setCheckInAt(record.checkInAt ? record.checkInAt.slice(0, 16) : '');
      setCheckOutAt(record.checkOutAt ? record.checkOutAt.slice(0, 16) : '');
      setNotes(record.notes || '');
      setError(null);
    }
  }, [record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recordId) return;
    setError(null);

    try {
      const payload: Record<string, unknown> = { status };

      if (checkInAt) {
        payload.checkInAt = new Date(checkInAt).toISOString();
      } else {
        payload.checkInAt = null;
      }

      if (checkOutAt) {
        payload.checkOutAt = new Date(checkOutAt).toISOString();
      } else {
        payload.checkOutAt = null;
      }

      payload.notes = notes || '';

      await updateMutation.mutateAsync({ id: recordId, ...payload });
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to update attendance record');
      }
    }
  }

  const isPending = detailLoading || updateMutation.isPending;

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700' },
    { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700' },
    { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700' },
    { value: 'half-day', label: 'Half Day', color: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <Dialog
      open={!!recordId}
      onClose={onClose}
      title=""
      size="md"
      footer={
        <div className="flex w-full gap-3 sm:w-auto">
          <Button variant="outline" type="button" onClick={onClose} className="flex-1 sm:flex-initial">
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="correction-form" disabled={isPending} className="flex-1 sm:flex-initial">
            {updateMutation.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      }
    >
      {/* Header banner */}
      <div className="-mx-6 -mt-5 mb-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Correct Attendance Record</h2>
            <p className="text-xs text-slate-500">Update status, timestamps, or add notes</p>
          </div>
        </div>
      </div>

      {detailLoading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Loading record...</p>
        </div>
      )}

      {!detailLoading && !record && (
        <div className="flex flex-col items-center gap-3 py-10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p className="text-sm text-slate-500">Record not found</p>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      )}

      {!detailLoading && record && (
        <form id="correction-form" onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Read-only info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-3">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Staff</p>
                <p className="text-sm font-medium text-slate-800">{record.employee.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(record.date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Status selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-all active:scale-95 ${
                    status === opt.value
                      ? `${opt.color} border-transparent ring-2 ring-offset-1 ring-slate-300`
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Timestamps</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="correction-in" className="mb-1 block text-xs text-slate-500">
                  Check In
                </label>
                <Input
                  id="correction-in"
                  type="datetime-local"
                  value={checkInAt}
                  onChange={(e) => setCheckInAt(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="correction-out" className="mb-1 block text-xs text-slate-500">
                  Check Out
                </label>
                <Input
                  id="correction-out"
                  type="datetime-local"
                  value={checkOutAt}
                  onChange={(e) => setCheckOutAt(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Leave blank to clear the timestamp</p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="correction-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="correction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ring focus:border-blue-500 resize-none"
              placeholder="Reason for correction..."
            />
            <p className="mt-1 text-right text-xs text-slate-400">{notes.length}/500</p>
          </div>
        </form>
      )}
    </Dialog>
  );
}
