'use client';

import { useCallback } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import { useExportReport } from '../api';
import type { ReportType } from '../schema';

interface ExportButtonProps {
  type: ReportType;
  range: string;
  from?: string;
  to?: string;
}

export default function ExportButton({ type, range, from, to }: ExportButtonProps) {
  const mutation = useExportReport();

  const handleExport = useCallback(() => {
    mutation.mutate({ type, range, from, to });
  }, [mutation, type, range, from, to]);

  return (
    <PermissionGate module="reports" action="create">
      <Button
        variant="primary"
        size="sm"
        onClick={handleExport}
        disabled={mutation.isPending}
        className="shadow-blue-500/25"
      >
        {mutation.isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        <span className="ml-1.5">{mutation.isPending ? 'Exporting...' : 'Export PDF'}</span>
      </Button>
    </PermissionGate>
  );
}
