'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type {
  SalesReport,
  ProductIncomeEntry,
  CategoryIncomeEntry,
} from '../api';

interface SalesReportViewProps {
  data: SalesReport;
}

export default function SalesReportView({ data }: SalesReportViewProps) {
  const productColumns: Column<ProductIncomeEntry>[] = [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category', hideOnMobile: true },
    { key: 'unitsSold', label: 'Sold' },
    {
      key: 'orderCount',
      label: 'Orders',
      render: (item) => item.orderCount,
    },
    {
      key: 'income',
      label: 'Income',
      render: (item) => `৳${item.income.toLocaleString()}`,
    },
  ];

  const categoryColumns: Column<CategoryIncomeEntry>[] = [
    { key: 'category', label: 'Category' },
    { key: 'unitsSold', label: 'Sold' },
    {
      key: 'income',
      label: 'Income',
      render: (item) => `৳${item.income.toLocaleString()}`,
    },
  ];

  const paymentMethods = Object.entries(data.byPaymentMethod).map(([method, entry]) => ({
    method,
    count: entry.count,
    revenue: entry.revenue,
  }));

  const paymentColumns: Column<(typeof paymentMethods)[number]>[] = [
    { key: 'method', label: 'Method', className: 'capitalize' },
    { key: 'count', label: 'Orders' },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (item) => `৳${item.revenue.toLocaleString()}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Sales Overview</h2>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {data.range.from} — {data.range.to}
            </p>
          </div>
        </div>
        <ReportSummaryCards type="sales" data={data} />
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">By Product</h3>
        </div>
        <DataTable
          columns={productColumns}
          data={data.byProduct}
          keyExtractor={(item) => item.productId}
          emptyMessage="No product data for this period."
        />
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">By Category</h3>
        </div>
        <DataTable
          columns={categoryColumns}
          data={data.byCategory}
          keyExtractor={(item) => item.category}
          emptyMessage="No category data for this period."
        />
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Payment Methods</h3>
        </div>
        <DataTable
          columns={paymentColumns}
          data={paymentMethods}
          keyExtractor={(item) => item.method}
          emptyMessage="No payment data for this period."
        />
      </div>
    </div>
  );
}
