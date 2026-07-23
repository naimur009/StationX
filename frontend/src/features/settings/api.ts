'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface BusinessHourEntry {
  day: Day;
  open: string | null;
  close: string | null;
}

export interface SettingsResponse {
  _id: string;
  restaurantName: string;
  address: string;
  logo: { url: string; publicId: string };
  contactNumber: string;
  vatInfo: { bin: string; mushak: string };
  businessHours: BusinessHourEntry[];
  loyaltyOrderThreshold: number;
  tableCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SettingsUpdateData {
  restaurantName?: string;
  address?: string;
  logo?: { url?: string; publicId?: string };
  contactNumber?: string;
  businessHours?: BusinessHourEntry[];
  vatInfo?: { bin?: string; mushak?: string };
  loyaltyOrderThreshold?: number;
  tableCount?: number;
}

export interface PublicSettingsResponse {
  restaurantName: string;
  logo: { url: string; publicId: string } | null;
  loyaltyOrderThreshold: number;
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => apiClient<{ data: PublicSettingsResponse }>('/settings/public'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient<{ data: SettingsResponse }>('/settings'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettingsUpdateData) =>
      apiClient<{ data: SettingsResponse }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useResetData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient<{ data: { success: boolean } }>('/settings/reset', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDownloadBackup() {
  return useQuery({
    queryKey: ['settings', 'backup'],
    queryFn: () => apiClient<Record<string, unknown[]>>('/settings/backup'),
    enabled: false,
    retry: false,
  });
}

export interface RestoreStats {
  collections: number;
  documents: number;
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown[]>) =>
      apiClient<{ data: { success: boolean; stats: RestoreStats } }>('/settings/restore', {
        method: 'POST',
        body: JSON.stringify({ data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
