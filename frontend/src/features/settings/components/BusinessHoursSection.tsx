'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { businessHoursSchema } from '../schema';
import { useSettings, useUpdateSettings } from '../api';
import PermissionGate from '@/components/shared/PermissionGate';
import type { z } from 'zod';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_HOURS: { day: Day; open: string; close: string; isOpen: boolean }[] = [
  { day: 'monday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'tuesday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'wednesday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'thursday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'friday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'saturday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'sunday', open: '09:00', close: '22:00', isOpen: true },
];

type BusinessHoursOutput = z.output<typeof businessHoursSchema>;

export default function BusinessHoursSection() {
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: { hours: DEFAULT_HOURS },
  });

  const watchedHours = useWatch({ control, name: 'hours' });

  useEffect(() => {
    if (settingsData?.data) {
      const serverHours = settingsData.data.businessHours;
      const hours = serverHours.map((h) => {
        if (!DAYS.includes(h.day as Day)) {
          console.warn(`[Settings] Invalid day value from server: ${h.day}`);
          return { day: 'monday' as const, open: '09:00', close: '22:00', isOpen: true };
        }
        return {
          day: h.day as Day,
          open: h.open || '09:00',
          close: h.close || '22:00',
          isOpen: h.open !== null && h.close !== null,
        };
      });
      reset({ hours });
    }
  }, [settingsData, reset]);

  async function onSubmit(data: BusinessHoursOutput) {
    setStatus('saving');
    try {
      const businessHours = data.hours.map((h) => ({
        day: h.day,
        open: h.isOpen ? h.open || '09:00' : null,
        close: h.isOpen ? h.close || '22:00' : null,
      }));
      await updateMutation.mutateAsync({ businessHours });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[Settings] BusinessHours save failed:', err);
      setErrorMessage(err instanceof AppError ? err.message : 'Failed to save — try again');
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage(null);
      }, 4000);
    }
  }

  function handleReset() {
    reset({ hours: DEFAULT_HOURS });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>Set operating hours for each day of the week</CardDescription>
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
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set operating hours for each day of the week</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            {watchedHours?.map((_, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="w-24 text-sm font-medium text-slate-700">
                  {DAY_LABELS[watchedHours[index]?.day || '']}
                  <input type="hidden" {...register(`hours.${index}.day`)} />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    {...register(`hours.${index}.isOpen`)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-ring"
                  />
                  Open
                </label>

                {watchedHours?.[index]?.isOpen && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      {...register(`hours.${index}.open`)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring focus:border-blue-500"
                    />
                    <span className="text-sm text-slate-400">to</span>
                    <input
                      type="time"
                      {...register(`hours.${index}.close`)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring focus:border-blue-500"
                    />
                  </div>
                )}

                {!watchedHours?.[index]?.isOpen && (
                  <span className="text-sm text-slate-400">Closed</span>
                )}
              </div>
            ))}
          </div>

          {errors.hours && (
            <p className="text-xs text-red-500">Please check the hours format (HH:mm).</p>
          )}

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

            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              Reset to Defaults
            </Button>

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
