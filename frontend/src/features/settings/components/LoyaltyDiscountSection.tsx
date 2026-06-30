'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { loyaltyDiscountSchema, type LoyaltyDiscountFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';

export default function LoyaltyDiscountSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<LoyaltyDiscountFormData>({
    resolver: zodResolver(loyaltyDiscountSchema),
    defaultValues: {
      loyaltyOrderThreshold: 0,
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset({ loyaltyOrderThreshold: settingsData.data.loyaltyOrderThreshold ?? 0 });
    }
  }, [settingsData, reset]);

  async function onSubmit(data: LoyaltyDiscountFormData) {
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({ loyaltyOrderThreshold: data.loyaltyOrderThreshold });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] Loyalty threshold save failed:', err);
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
          <CardTitle>Loyalty Threshold</CardTitle>
          <CardDescription>Set order threshold for customer loyalty notification</CardDescription>
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
        <CardTitle>Loyalty Threshold</CardTitle>
        <CardDescription>When a customer reaches this many orders, you will be notified in the POS</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="loyaltyOrderThreshold" className="text-sm font-medium text-slate-700">
              Order Threshold
            </label>
            <Input
              id="loyaltyOrderThreshold"
              type="number"
              min={0}
              {...register('loyaltyOrderThreshold')}
            />
            <p className="text-xs text-slate-400">
              Set to 0 to disable. When enabled, customers who reach this threshold will show a notification in POS.
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
