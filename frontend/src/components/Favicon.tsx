'use client';

import { useEffect } from 'react';
import { usePublicSettings } from '@/features/homepage/api';

export default function Favicon() {
  const { data } = usePublicSettings();
  const logoUrl = data?.data?.logo?.url;

  useEffect(() => {
    if (!logoUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  }, [logoUrl]);

  return null;
}
