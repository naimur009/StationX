'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type { ExpenseReport, CategoryExpenseEntry, VendorExpenseEntry, DailyExpenseEntry } from '../api';

interface ExpenseReportViewProps {
  data: ExpenseReport;
}

export default function ExpenseReportView({ data }: ExpenseReportViewProps) {
  const categoryColumns: Column<CategoryExpenseEntry>[] = [
    { key: 'category', label: 'Category' },
    { key: 'count', label: 'Count' },
    { key: 'total', label: 'Total', render: (item) => `৳${item.total.toLocaleString()}` },
  ];

  const vendorColumns: Column<VendorExpenseEntry>[] = [
    { key: 'vendorName', label: 'Vendor' },
    { key: 'count', label: 'Count' },
    { key: 'total', label: 'Total', render: (item) => `৳${item.total.toLocaleString()}` },
  ];

  const paymentMethods = Object.entries(data.byPaymentMethod).map(([method, entry]) => ({
    method,
    count: entry.count,
    total: entry.total,
  }));

  const paymentColumns: Column<(typeof paymentMethods)[number]>[] = [
    { key: 'method', label: 'Method', className: 'capitalize' },
    { key: 'count', label: 'Count' },
    { key: 'total', label: 'Total', render: (item) => `৳${item.total.toLocaleString()}` },
  ];

  const dailyColumns: Column<DailyExpenseEntry>[] = [
    { key: 'date', label: 'Date' },
    { key: 'count', label: 'Count' },
    { key: 'total', label: 'Total', render: (item) => `৳${item.total.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <ReportSummaryCards type="expense" data={data} />

      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Category</h3>
          <DataTable
            columns={categoryColumns}
            data={data.byCategory}
            keyExtractor={(item) => item.category}
            emptyMessage="No expense categories for this period."
          />
        </div>

        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Vendor</h3>
          <DataTable
            columns={vendorColumns}
            data={data.byVendor}
            keyExtractor={(item) => item.vendorId ?? 'unnamed'}
            emptyMessage="No vendor data for this period."
          />
        </div>

        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Payment Method</h3>
          <DataTable
            columns={paymentColumns}
            data={paymentMethods}
            keyExtractor={(item) => item.method}
            emptyMessage="No payment method data for this period."
          />
        </div>

        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">Daily Trend</h3>
          <DataTable
            columns={dailyColumns}
            data={data.dailyBreakdown}
            keyExtractor={(item) => item.date}
            emptyMessage="No daily expense data for this period."
          />
        </div>
      </div>
    </div>
  );
}
