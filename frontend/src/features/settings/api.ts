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
  taxId: string;
  businessHours: BusinessHourEntry[];
  taxConfig: { mode: string; rate: number };
  loyaltyOrderThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface SettingsUpdateData {
  restaurantName?: string;
  address?: string;
  logo?: { url?: string; publicId?: string };
  contactNumber?: string;
  taxId?: string;
  businessHours?: BusinessHourEntry[];
  taxConfig?: { mode: string; rate: number };
  loyaltyOrderThreshold?: number;
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
    },
  });
}
