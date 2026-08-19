'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, CheckCircle2, CloudUpload, FileJson, Trash2, X } from 'lucide-react';
import { useResetData, useRestoreBackup } from '@/features/settings/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PermissionGate from '@/components/shared/PermissionGate';
import { AppError } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function DataManagementSection() {
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<Record<string, number> | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'downloading' | 'success'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMutation = useResetData();
  const restoreMutation = useRestoreBackup();

  useEffect(() => {
    return () => {
      if (downloadResetTimer.current) {
        clearTimeout(downloadResetTimer.current);
      }
    };
  }, []);

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
    setDownloadPhase('downloading');
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
      setDownloadPhase('success');
      toast.success('Backup downloaded successfully');
      if (downloadResetTimer.current) {
        clearTimeout(downloadResetTimer.current);
      }
      downloadResetTimer.current = setTimeout(() => {
        setDownloadPhase('idle');
      }, 2500);
    } catch {
      setDownloadPhase('idle');
      toast.error('Failed to download backup');
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      e.target.value = '';
      return;
    }

    setRestoreFile(file);
    setIsReadingFile(true);

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
      toast.success('Backup file loaded successfully');
    } catch {
      toast.error('Invalid JSON file');
      setRestoreFile(null);
      setRestorePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsReadingFile(false);
    }
  }, []);

  const clearRestoreFile = useCallback(() => {
    setRestoreFile(null);
    setRestorePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      clearRestoreFile();
      setRestoreDialogOpen(false);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to restore backup');
      }
    } finally {
      setIsRestoring(false);
    }
  }, [restoreFile, restoreMutation, clearRestoreFile]);

  const resetEnabled = resetConfirmText === 'RESET';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Data Management</h2>
        <p className="mt-1 text-sm text-slate-500">Reset, backup, and restore restaurant data</p>
      </div>

      {/* Reset All Data */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-700">Reset All Data</h3>
            <p className="mt-1 text-sm text-slate-600">
              This will permanently delete all records including orders, products, categories, customers,
              vendors, expenses, coupons, tasks, attendance, salaries, activity logs, and more.
              Settings will be reset to defaults. Admin accounts will be preserved.
            </p>
          </div>
        </div>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>All orders, products, categories, and coupons will be deleted</li>
          <li>All customers, vendors, expenses, and attendance records will be deleted</li>
          <li>All tasks, salaries, activity logs will be deleted</li>
          <li>Settings will be reset to default values</li>
          <li className="font-medium text-green-700">Admin accounts will NOT be affected</li>
        </ul>

        <PermissionGate module="settings" action="edit">
          <Button
            variant="destructive"
            className="mt-4"
            disabled={resetMutation.isPending}
            onClick={() => { setResetDialogOpen(true); setError(null); }}
          >
            {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {resetMutation.isPending ? 'Resetting...' : 'Reset All Data'}
          </Button>
        </PermissionGate>

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
                {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {resetMutation.isPending ? 'Resetting...' : 'Reset All Data'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 animate-[fade-in_200ms_ease-out]">
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
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Download Backup</h3>
            <p className="mt-1 text-sm text-slate-600">
              Download a complete backup of all data as a JSON file. The backup includes all records
              and settings. It can be used later to restore the system.
            </p>
          </div>
        </div>

        <PermissionGate module="settings" action="edit">
          <Button
            variant="primary"
            className="mt-4 min-w-[180px]"
            onClick={handleDownloadBackup}
            disabled={downloadPhase === 'downloading'}
          >
            {downloadPhase === 'downloading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing Backup...
              </>
            ) : downloadPhase === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4 animate-[success-pop_300ms_ease-out]" />
                Backup Ready
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Backup
              </>
            )}
          </Button>

          {downloadPhase === 'downloading' && (
            <div className="mt-4 max-w-md animate-[fade-in_200ms_ease-out] rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="animate-[status-pulse_1.5s_ease-in-out_infinite]">
                  Fetching all records from the server...
                </span>
              </div>
              <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
                <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-primary to-warning animate-[progress-slide_1.2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {downloadPhase === 'success' && (
            <div className="mt-4 max-w-md animate-[fade-in_200ms_ease-out] rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Backup downloaded and saved to your device.
              </div>
            </div>
          )}
        </PermissionGate>
      </div>

      {/* Restore Backup */}
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <CloudUpload className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-700">Restore from Backup</h3>
            <p className="mt-1 text-sm text-slate-600">
              Restore data from a previously downloaded backup file. This will replace all existing data
              with the backup contents.
            </p>
          </div>
        </div>

        <PermissionGate module="settings" action="edit">
          <label className="group mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 px-6 py-8 text-center transition-colors hover:border-amber-400 hover:bg-amber-50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="sr-only"
            />
            {isReadingFile ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Reading backup file...</span>
                <span className="text-xs text-slate-500">Extracting records and settings</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-8 w-8 text-amber-400 transition-transform group-hover:-translate-y-0.5" />
                <span className="text-sm font-semibold text-slate-700">Click to select a backup file</span>
                <span className="text-xs text-slate-500">JSON file exported from StationX</span>
              </>
            )}
          </label>

          {restoreFile && !isReadingFile && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 animate-[fade-in_200ms_ease-out]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <FileJson className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{restoreFile.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(restoreFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearRestoreFile}
                aria-label="Remove selected file"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-100 hover:text-amber-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

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
                disabled={isRestoring}
                onClick={() => { setRestoreDialogOpen(true); setError(null); }}
              >
                {isRestoring && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRestoring ? 'Restoring...' : 'Restore Backup'}
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
                      {isRestoring && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isRestoring ? 'Restoring...' : 'Restore Backup'}
                    </Button>
                  </>
                }
              >
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 animate-[fade-in_200ms_ease-out]">
                      {error}
                    </div>
                  )}
                  <p className="text-sm text-slate-600">
                    This will replace all existing data with the backup. Current data will be lost.
                    This action cannot be undone. Are you sure you want to proceed?
                  </p>
                  {isRestoring && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 animate-[fade-in_200ms_ease-out]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="animate-[status-pulse_1.5s_ease-in-out_infinite]">
                        Restoring data from backup...
                      </span>
                    </div>
                  )}
                </div>
              </Dialog>
            </div>
          )}
        </PermissionGate>
      </div>
    </div>
  );
}