'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type { SalesReport, PaymentMethodEntry, DailySalesEntry, ProductIncomeEntry, CategoryIncomeEntry } from '../api';

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

  const productColumns: Column<ProductIncomeEntry>[] = [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'unitsSold', label: 'Units Sold' },
    { key: 'income', label: 'Income', render: (item) => `৳${item.income.toLocaleString()}` },
    {
      key: 'percentageOfTotal',
      label: '% of Total',
      render: (item) => `${item.percentageOfTotal}%`,
    },
  ];

  const categoryColumns: Column<CategoryIncomeEntry>[] = [
    { key: 'category', label: 'Category' },
    { key: 'unitsSold', label: 'Units Sold' },
    { key: 'income', label: 'Income', render: (item) => `৳${item.income.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <ReportSummaryCards type="sales" data={data} />

      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Product</h3>
          <DataTable
            columns={productColumns}
            data={data.byProduct}
            keyExtractor={(item) => item.productId}
            emptyMessage="No product data for this period."
          />
        </div>

        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Category</h3>
          <DataTable
            columns={categoryColumns}
            data={data.byCategory}
            keyExtractor={(item) => item.category}
            emptyMessage="No category data for this period."
          />
        </div>

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
