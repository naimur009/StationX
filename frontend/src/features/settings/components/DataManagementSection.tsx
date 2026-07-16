'use client';

import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useResetData, useRestoreBackup } from '@/features/settings/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppError } from '@/lib/utils';

export default function DataManagementSection() {
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<Record<string, number> | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetMutation = useResetData();
  const restoreMutation = useRestoreBackup();

  const handleReset = useCallback(async () => {
    setError(null);
    try {
      await resetMutation.mutateAsync();
      toast.success('All data has been reset to defaults');
      setResetConfirmText('');
      setResetDialogOpen(false);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to reset data');
      }
    }
  }, [resetMutation]);

  const handleDownloadBackup = useCallback(async () => {
    try {
      const { apiClient } = await import('@/lib/api-client');
      const backupData = await apiClient<Record<string, unknown[]>>('/settings/backup');
      const date = new Date().toISOString().split('T')[0];
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stationx-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch {
      toast.error('Failed to download backup');
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    setRestoreFile(file);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const preview: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
          preview[key] = value.length;
        }
      }
      setRestorePreview(preview);
    } catch {
      toast.error('Invalid JSON file');
      setRestoreFile(null);
      setRestorePreview(null);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    if (!restoreFile) return;
    setError(null);
    setIsRestoring(true);
    try {
      const text = await restoreFile.text();
      const parsed = JSON.parse(text);

      const backupData = parsed.data || parsed;
      if (backupData.data) {
        await restoreMutation.mutateAsync(backupData.data);
      } else {
        await restoreMutation.mutateAsync(backupData);
      }

      toast.success('Backup restored successfully');
      setRestoreFile(null);
      setRestorePreview(null);
      setRestoreDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to restore backup');
      }
    } finally {
      setIsRestoring(false);
    }
  }, [restoreFile, restoreMutation]);

  const resetEnabled = resetConfirmText === 'RESET';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Data Management</h2>
        <p className="mt-1 text-sm text-slate-500">Reset, backup, and restore restaurant data</p>
      </div>

      {/* Reset All Data */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-red-700">Reset All Data</h3>
        <p className="mt-2 text-sm text-slate-600">
          This will permanently delete all records including orders, products, categories, customers,
          vendors, expenses, coupons, tasks, attendance, salaries, activity logs, and more.
          Settings will be reset to defaults. Admin accounts will be preserved.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>All orders, products, categories, and coupons will be deleted</li>
          <li>All customers, vendors, expenses, and attendance records will be deleted</li>
          <li>All tasks, salaries, activity logs will be deleted</li>
          <li>Settings will be reset to default values</li>
          <li className="font-medium text-green-700">Admin accounts will NOT be affected</li>
        </ul>

        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => { setResetDialogOpen(true); setError(null); }}
        >
          Reset All Data
        </Button>

        <Dialog
          open={resetDialogOpen}
          onClose={() => { setResetDialogOpen(false); setResetConfirmText(''); setError(null); }}
          title="Reset All Data"
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => { setResetDialogOpen(false); setResetConfirmText(''); setError(null); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="md"
                disabled={!resetEnabled || resetMutation.isPending}
                onClick={handleReset}
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset All Data'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <p className="text-sm text-slate-600">
              This action cannot be undone. All restaurant data will be permanently deleted and
              settings reset to defaults. Type <strong>RESET</strong> to confirm.
            </p>
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Type RESET to confirm"
              className="w-full"
            />
          </div>
        </Dialog>
      </div>

      {/* Download Backup */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">Download Backup</h3>
        <p className="mt-2 text-sm text-slate-600">
          Download a complete backup of all data as a JSON file. The backup includes all records
          and settings. It can be used later to restore the system.
        </p>
        <Button variant="primary" className="mt-4" onClick={handleDownloadBackup}>
          Download Backup
        </Button>
      </div>

      {/* Restore Backup */}
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-amber-700">Restore from Backup</h3>
        <p className="mt-2 text-sm text-slate-600">
          Restore data from a previously downloaded backup file. This will replace all existing data
          with the backup contents.
        </p>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-hover"
          />
        </div>

        {restorePreview && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-700">Backup Preview</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(restorePreview).map(([collection, count]) => (
                <div key={collection} className="flex justify-between rounded-lg bg-white px-3 py-1.5 shadow-sm">
                  <span className="text-slate-600">{collection}</span>
                  <span className="font-semibold text-slate-800">{count}</span>
                </div>
              ))}
            </div>

            <Button
              variant="warning"
              className="mt-4"
              onClick={() => { setRestoreDialogOpen(true); setError(null); }}
            >
              Restore Backup
            </Button>

            <Dialog
              open={restoreDialogOpen}
              onClose={() => { setRestoreDialogOpen(false); setError(null); }}
              title="Restore from Backup?"
              size="sm"
              footer={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setRestoreDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="warning"
                    size="md"
                    disabled={isRestoring}
                    onClick={handleRestore}
                  >
                    {isRestoring ? 'Restoring...' : 'Restore Backup'}
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <p className="text-sm text-slate-600">
                  This will replace all existing data with the backup. Current data will be lost.
                  This action cannot be undone. Are you sure you want to proceed?
                </p>
              </div>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
