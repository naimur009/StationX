'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type { SalesReport, PaymentMethodEntry, DailySalesEntry, ProductIncomeEntry, CategoryIncomeEntry } from '../api';

interface SalesReportViewProps {
  data: SalesReport;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
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

  const productColumns: Column<ProductIncomeEntry>[] = [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'unitsSold', label: 'Sold' },
    { key: 'income', label: 'Income', render: (item) => `৳${item.income.toLocaleString()}` },
    {
      key: 'percentageOfTotal',
      label: '%',
      render: (item) => `${item.percentageOfTotal}%`,
    },
  ];

  const categoryColumns: Column<CategoryIncomeEntry>[] = [
    { key: 'category', label: 'Category' },
    { key: 'unitsSold', label: 'Sold' },
    { key: 'income', label: 'Income', render: (item) => `৳${item.income.toLocaleString()}` },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
          {data.range.from} — {data.range.to}
        </div>
        <ReportSummaryCards type="sales" data={data} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="By Product">
          <DataTable
            columns={productColumns}
            data={data.byProduct}
            keyExtractor={(item) => item.productId}
            emptyMessage="No product data for this period."
          />
        </SectionCard>

        <SectionCard title="By Category">
          <DataTable
            columns={categoryColumns}
            data={data.byCategory}
            keyExtractor={(item) => item.category}
            emptyMessage="No category data for this period."
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="By Payment Method">
          <DataTable
            columns={paymentColumns}
            data={paymentMethods}
            keyExtractor={(item) => item.method}
            emptyMessage="No payment data for this period."
          />
        </SectionCard>

        <SectionCard title="Daily Trend">
          <DataTable
            columns={dailyColumns}
            data={data.dailyBreakdown}
            keyExtractor={(item) => item.date}
            emptyMessage="No daily data for this period."
          />
        </SectionCard>
      </div>
    </div>
  );
}
