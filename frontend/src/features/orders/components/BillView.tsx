'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOrderBill } from '../api';

interface BillViewProps {
  orderId: string;
  orderNumber: string;
}

export default function BillView({ orderId, orderNumber }: BillViewProps) {
  const [mode, setMode] = useState<'preview' | 'print' | 'download'>('preview');
  const { data: htmlBill, isLoading: htmlLoading, isError: htmlError } = useOrderBill(orderId, 'html');
  const { data: pdfUrl, isLoading: pdfLoading, refetch: fetchPdf } = useOrderBill(orderId, 'pdf');

  const handlePrint = () => {
    if (htmlBill) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(htmlBill);
        win.document.close();
        win.onload = () => {
          win.print();
        };
      }
    }
  };

  const handleDownload = async () => {
    const result = await fetchPdf();
    if (result.data) {
      const url = result.data as string;
      const a = document.createElement('a');
      a.href = url;
      a.download = `bill-${orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-bold text-slate-800">Bill</h2>
        <div className="flex gap-2">
          <Button
            variant={mode === 'preview' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>
          <Button
            variant={mode === 'print' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setMode('print'); handlePrint(); }}
            disabled={!htmlBill || htmlLoading}
          >
            Print
          </Button>
          <Button
            variant={mode === 'download' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setMode('download'); handleDownload(); }}
            disabled={pdfLoading}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {htmlLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 spinner-smooth" />
        </div>
      )}

      {htmlError && (
        <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">
          Failed to load bill. Please try again.
        </div>
      )}

      {mode === 'preview' && htmlBill && !htmlLoading && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <iframe
            srcDoc={htmlBill}
            title="Bill preview"
            className="h-96 w-full"
            style={{ border: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
