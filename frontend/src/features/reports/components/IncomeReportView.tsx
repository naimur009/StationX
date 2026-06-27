'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type { IncomeReport, ProductIncomeEntry, CategoryIncomeEntry } from '../api';

interface IncomeReportViewProps {
  data: IncomeReport;
}

export default function IncomeReportView({ data }: IncomeReportViewProps) {
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
      <ReportSummaryCards type="income" data={data} />

      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Product</h3>
          <DataTable
            columns={productColumns}
            data={data.byProduct}
            keyExtractor={(item) => item.productId}
            emptyMessage="No product income data for this period."
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
      </div>
    </div>
  );
}
