'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { taxSchema, type TaxFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';

const CURRENCIES = [
  { code: 'BDT', label: 'BDT (Taka)' },
  { code: 'USD', label: 'USD (Dollar)' },
  { code: 'INR', label: 'INR (Rupee)' },
  { code: 'EUR', label: 'EUR (Euro)' },
  { code: 'GBP', label: 'GBP (Pound)' },
] as const;

export default function TaxSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaxFormData>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      taxId: '',
      currency: 'BDT',
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset({
        taxId: settingsData.data.taxId || '',
        currency: settingsData.data.currency || 'BDT',
      });
    }
  }, [settingsData, reset]);

  async function onSubmit(data: TaxFormData) {
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({
        taxId: data.taxId,
        currency: data.currency,
        taxConfig: { mode: 'none', rate: 0 },
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] Tax save failed:', err);
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
          <CardTitle>Tax & Currency</CardTitle>
          <CardDescription>Tax configuration and currency settings</CardDescription>
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
        <CardTitle>Tax & Currency</CardTitle>
        <CardDescription>Tax configuration and currency settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="taxId" className="text-sm font-medium text-slate-700">
              Tax / GST ID
            </label>
            <Input id="taxId" {...register('taxId')} placeholder="Optional" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="currency" className="text-sm font-medium text-slate-700">
              Currency
            </label>
            <select
              id="currency"
              {...register('currency')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring focus:border-blue-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p className="text-xs text-red-500">{errors.currency.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tax Mode</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
              No Tax (v1)
            </div>
            <p className="text-xs text-slate-400">
              Tax calculation is not available in this version.
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
