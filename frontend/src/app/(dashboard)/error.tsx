'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        <Button variant="primary" size="md" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
