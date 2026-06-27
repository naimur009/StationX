'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type { SalesReport, PaymentMethodEntry, DailySalesEntry } from '../api';

interface SalesReportViewProps {
  data: SalesReport;
}

export default function SalesReportView({ data }: SalesReportViewProps) {
  const paymentMethods = Object.entries(data.byPaymentMethod).map(([method, entry]) => ({
    method,
    count: entry.count,
    revenue: entry.revenue,
  }));

  const paymentColumns: Column<(typeof paymentMethods)[number]>[] = [
    { key: 'method', label: 'Method', className: 'capitalize' },
    { key: 'count', label: 'Orders' },
    { key: 'revenue', label: 'Revenue', render: (item) => `৳${item.revenue.toLocaleString()}` },
  ];

  const dailyColumns: Column<DailySalesEntry>[] = [
    { key: 'date', label: 'Date' },
    { key: 'orders', label: 'Orders' },
    { key: 'revenue', label: 'Revenue', render: (item) => `৳${item.revenue.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <ReportSummaryCards type="sales" data={data} />

      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Payment Method</h3>
          <DataTable
            columns={paymentColumns}
            data={paymentMethods}
            keyExtractor={(item) => item.method}
            emptyMessage="No payment data for this period."
          />
        </div>

        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">Daily Trend</h3>
          <DataTable
            columns={dailyColumns}
            data={data.dailyBreakdown}
            keyExtractor={(item) => item.date}
            emptyMessage="No daily data for this period."
          />
        </div>
      </div>
    </div>
  );
}
