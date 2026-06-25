'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { businessInfoSchema, type BusinessInfoFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';

export default function BusinessInfoSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BusinessInfoFormData>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      restaurantName: '',
      address: '',
      contactNumber: '',
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset({
        restaurantName: settingsData.data.restaurantName || '',
        address: settingsData.data.address || '',
        contactNumber: settingsData.data.contactNumber || '',
      });
    }
  }, [settingsData, reset]);

  async function onSubmit(data: BusinessInfoFormData) {
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({
        restaurantName: data.restaurantName,
        address: data.address,
        contactNumber: data.contactNumber,
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] BusinessInfo save failed:', err);
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
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Restaurant name, address, and contact details</CardDescription>
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
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Restaurant name, address, and contact details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="restaurantName" className="text-sm font-medium text-slate-700">
              Restaurant Name
            </label>
            <Input
              id="restaurantName"
              {...register('restaurantName')}
              error={!!errors.restaurantName}
              placeholder="StationX"
            />
            {errors.restaurantName && (
              <p className="text-xs text-red-500">{errors.restaurantName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="address" className="text-sm font-medium text-slate-700">
              Address
            </label>
            <Input id="address" {...register('address')} placeholder="123 Main St, City" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contactNumber" className="text-sm font-medium text-slate-700">
              Contact Number
            </label>
            <Input
              id="contactNumber"
              {...register('contactNumber')}
              placeholder="+880-XXX-XXXXXX"
            />
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
