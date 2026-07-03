'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePublicSettings } from '@/features/homepage/api';

export default function Favicon() {
  const pathname = usePathname();
  const { data } = usePublicSettings();
  const logoUrl = data?.data?.logo?.url;

  useEffect(() => {
    if (!logoUrl) return;

    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      || document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');

    if (link && link.href !== logoUrl) {
      link.href = logoUrl;
    }
  }, [logoUrl, pathname]);

  return null;
}
