'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Table } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { tableSettingsSchema, type TableSettingsFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';

export default function TableSettingsSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<TableSettingsFormData>({
    resolver: zodResolver(tableSettingsSchema),
    defaultValues: {
      tableCount: 0,
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset({
        tableCount: settingsData.data.tableCount ?? 0,
      });
    }
  }, [settingsData, reset]);

  async function onSubmit(data: TableSettingsFormData) {
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({
        tableCount: data.tableCount,
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] Table count save failed:', err);
      setErrorMessage(err instanceof AppError ? err.message : 'Failed to save — try again');
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage(null);
      }, 4000);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Table Settings</CardTitle>
          <CardDescription>Configure restaurant tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-48 animate-pulse rounded-xl bg-slate-200" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Table className="h-5 w-5 text-slate-500" />
          <div>
            <CardTitle>Table Settings</CardTitle>
            <CardDescription>Set the total number of tables in your restaurant</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="tableCount" className="text-sm font-medium text-slate-700">
              Number of Tables
            </label>
            <Input
              id="tableCount"
              type="number"
              min={0}
              max={100}
              {...register('tableCount')}
              placeholder="e.g. 20"
            />
            <p className="text-xs text-slate-400">
              Tables will be auto-created with sequential labels (1, 2, 3...). Existing tables with active orders will not be removed if you lower the count.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PermissionGate module="settings" action="edit">
              <Button type="submit" variant="primary" size="sm" disabled={status === 'saving'}>
                {status === 'saving' ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </PermissionGate>

            {status === 'saved' && (
              <span className="text-sm font-medium text-green-600">Saved</span>
            )}
            {status === 'error' && (
              <span className="text-sm font-medium text-red-500">{errorMessage}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
