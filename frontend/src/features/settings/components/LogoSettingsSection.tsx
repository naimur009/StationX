'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { logoSchema, type LogoFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';
import ImageUpload from '@/components/shared/ImageUpload';

export default function LogoSettingsSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<LogoFormData>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      logo: { url: '', publicId: '' },
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset({
        logo: {
          url: settingsData.data.logo?.url || '',
          publicId: settingsData.data.logo?.publicId || '',
        },
      });
    }
  }, [settingsData, reset]);

  const currentLogo = watch('logo');

  function handleLogoChange(value: { url: string; publicId: string } | null) {
    setValue('logo.url', value?.url || '', { shouldValidate: true });
    setValue('logo.publicId', value?.publicId || '', { shouldValidate: true });
  }

  async function onSubmit(data: LogoFormData) {
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({
        logo: { url: data.logo.url || '', publicId: data.logo.publicId || '' },
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] Logo save failed:', err);
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
          <CardTitle>Restaurant Logo</CardTitle>
          <CardDescription>Upload your restaurant logo</CardDescription>
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
        <CardTitle>Restaurant Logo</CardTitle>
        <CardDescription>Upload your restaurant logo</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ImageUpload
            value={currentLogo?.url ? { url: currentLogo.url, publicId: currentLogo.publicId || '' } : null}
            onChange={handleLogoChange}
            folder="logos"
            aspectRatio="2:1"
          />

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
