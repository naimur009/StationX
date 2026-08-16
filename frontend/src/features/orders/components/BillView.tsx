'use client';

import { useState } from 'react';
import { Download, Eye, Printer, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderBill } from '../api';

interface BillViewProps {
  orderId: string;
  orderNumber: string;
}

export default function BillView({ orderId, orderNumber }: BillViewProps) {
  const [mode, setMode] = useState<'preview' | 'print' | 'download'>('preview');
  const { data: htmlBill, isLoading: htmlLoading, isError: htmlError } = useOrderBill(orderId, 'html');
  const { isLoading: pdfLoading, refetch: fetchPdf } = useOrderBill(orderId, 'pdf');

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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ReceiptText className="h-3.5 w-3.5" />
          </span>
          Bill
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === 'preview' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            variant={mode === 'print' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setMode('print'); handlePrint(); }}
            disabled={!htmlBill || htmlLoading}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            variant={mode === 'download' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setMode('download'); handleDownload(); }}
            disabled={pdfLoading}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
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
        <div className="rounded-xl bg-slate-100/70 p-2 sm:p-4">
          <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <iframe
              srcDoc={htmlBill}
              title="Bill preview"
              className="h-[28rem] w-full sm:h-[32rem]"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}