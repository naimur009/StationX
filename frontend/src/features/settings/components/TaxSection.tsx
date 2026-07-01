'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { vatInfoSchema, type VatInfoFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';

export default function TaxSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<VatInfoFormData>({
    resolver: zodResolver(vatInfoSchema),
    defaultValues: {
      bin: '',
      mushak: '',
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset({
        bin: settingsData.data.vatInfo?.bin || '',
        mushak: settingsData.data.vatInfo?.mushak || '',
      });
    }
  }, [settingsData, reset]);

  async function onSubmit(data: VatInfoFormData) {
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({
        vatInfo: { bin: data.bin, mushak: data.mushak },
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] VAT save failed:', err);
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
          <CardTitle>VAT Information</CardTitle>
          <CardDescription>VAT registration details</CardDescription>
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
          <FileText className="h-5 w-5 text-slate-500" />
          <div>
            <CardTitle>VAT Information</CardTitle>
            <CardDescription>Manage your VAT registration details</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="bin" className="text-sm font-medium text-slate-700">
              BIN <span className="text-xs text-slate-400">(Business Identification Number)</span>
            </label>
            <Input id="bin" {...register('bin')} placeholder="e.g. 001234567-0101" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mushak" className="text-sm font-medium text-slate-700">
              Mushak <span className="text-xs text-slate-400">(Mushak Number)</span>
            </label>
            <Input id="mushak" {...register('mushak')} placeholder="e.g. 123456789-101" />
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
