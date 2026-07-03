'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface PublicLogo {
  url: string;
  publicId: string;
}

export interface PublicSettings {
  restaurantName: string;
  logo: PublicLogo | null;
}

export type PublicSettingsResponse = { data: PublicSettings };

export function usePublicSettings() {
  return useQuery({
    queryKey: ['public-settings'],
    queryFn: () => apiClient<PublicSettingsResponse>('/settings/public', { skipAuth: true }),
    staleTime: 300000,
  });
}
