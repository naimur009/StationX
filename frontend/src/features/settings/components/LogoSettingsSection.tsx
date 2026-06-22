'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ImageIcon, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { logoSchema, type LogoFormData } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';

export default function LogoSettingsSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LogoFormData>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      logo: { url: '', publicId: '' },
    },
  });

  const logoUrl = watch('logo.url');

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

  function handleClear() {
    setValue('logo.url', '');
    setValue('logo.publicId', '');
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
          {logoUrl ? (
            <div className="relative inline-block">
              <img
                src={logoUrl}
                alt="Restaurant logo preview"
                className="h-24 w-24 rounded-xl border border-slate-200 object-cover shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" fill="%2394a3b8"><rect width="96" height="96" rx="12"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10">No Image</text></svg>';
                }}
              />
              <button
                type="button"
                onClick={handleClear}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                aria-label="Remove logo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
              <ImageIcon className="h-8 w-8 text-slate-400" />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="logoUrl" className="text-sm font-medium text-slate-700">
              Logo URL
            </label>
            <Input
              id="logoUrl"
              {...register('logo.url')}
              placeholder="https://res.cloudinary.com/..."
              error={!!errors.logo?.url}
            />
            <p className="text-xs text-slate-400">
              Enter the URL of your uploaded logo image.
            </p>
            {errors.logo?.url && (
              <p className="text-xs text-red-500">{errors.logo?.url.message}</p>
            )}
          </div>

          <div className="text-xs text-amber-600">
            Note: File upload is not yet available. Use a hosted image URL for now.
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
