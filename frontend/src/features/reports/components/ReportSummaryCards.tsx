'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Receipt,
  Percent,
} from 'lucide-react';
import type { ReportType } from '../schema';
import type {
  SalesReport,
  ProfitReport,
} from '../api';

interface ReportSummaryCardsProps {
  type: ReportType;
  data: SalesReport | ProfitReport;
}

export default function ReportSummaryCards({ type, data }: ReportSummaryCardsProps) {
  switch (type) {
    case 'sales': {
      const s = (data as SalesReport).summary;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Revenue" value={`৳${s.totalRevenue.toLocaleString()}`} icon={DollarSign} color="blue" />
          <MetricCard title="Total Orders" value={s.totalOrders} icon={ShoppingCart} color="green" />
          <MetricCard title="Products Sold" value={s.totalProductsSold} icon={Package} color="green" />
          <MetricCard title="Total VAT" value={`৳${s.totalTaxAmount.toLocaleString()}`} icon={Receipt} color="indigo" />
          <MetricCard title="Total Discount" value={`৳${s.totalDiscountAmount.toLocaleString()}`} icon={Percent} color="yellow" />
        </div>
      );
    }
    case 'profit': {
      const p = data as ProfitReport;
      const profitColor = p.profit >= 0 ? 'green' : 'red';
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Revenue" value={`৳${p.income.totalRevenue.toLocaleString()}`} icon={DollarSign} color="blue" />
          <MetricCard title="Total Expenses" value={`৳${p.expenses.totalExpenses.toLocaleString()}`} icon={DollarSign} color="red" />
          <MetricCard title="Total Salary" value={`৳${p.salaries.totalSalary.toLocaleString()}`} icon={DollarSign} color="yellow" />
          <MetricCard title="Net Profit" value={`${p.profit >= 0 ? '+' : ''}৳${p.profit.toLocaleString()}`} icon={DollarSign} color={profitColor} />
        </div>
      );
    }
  }
}
