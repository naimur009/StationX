'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Percent,
  PiggyBank,
  HandCoins,
  Users,
  UserCheck,
  UserX,
  Clock,
  SunDim,
  type LucideIcon,
} from 'lucide-react';
import type { ReportType } from '../schema';
import type {
  SalesReport,
  IncomeReport,
  ExpenseReport,
  AttendanceReport,
} from '../api';

interface ReportSummaryCardsProps {
  type: ReportType;
  data: SalesReport | IncomeReport | ExpenseReport | AttendanceReport;
}

export default function ReportSummaryCards({ type, data }: ReportSummaryCardsProps) {
  switch (type) {
    case 'sales': {
      const s = (data as SalesReport).summary;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Revenue" value={`৳${s.totalRevenue.toLocaleString()}`} icon={DollarSign as LucideIcon} color="blue" />
          <MetricCard title="Total Orders" value={s.totalOrders} icon={ShoppingCart as LucideIcon} color="green" />
          <MetricCard title="Avg Order Value" value={`৳${s.averageOrderValue.toLocaleString()}`} icon={PiggyBank as LucideIcon} color="slate" />
          <MetricCard title="Products Sold" value={s.totalProductsSold} icon={Package as LucideIcon} color="green" />
        </div>
      );
    }
    case 'income': {
      const s = (data as IncomeReport).summary;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Income" value={`৳${s.totalIncome.toLocaleString()}`} icon={HandCoins as LucideIcon} color="indigo" />
          <MetricCard title="Products Sold" value={s.totalProductsSold} icon={Package as LucideIcon} color="blue" />
          <MetricCard title="Unique Products" value={s.uniqueProductsSold} icon={Package as LucideIcon} color="slate" />
          <MetricCard title="Top Category" value={s.topCategory || 'N/A'} icon={Percent as LucideIcon} color="slate" />
        </div>
      );
    }
    case 'expense': {
      const s = (data as ExpenseReport).summary;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="Total Expenses" value={`৳${s.totalExpenses.toLocaleString()}`} icon={DollarSign as LucideIcon} color="red" />
          <MetricCard title="Entries" value={s.totalEntries} icon={ShoppingCart as LucideIcon} color="yellow" />
          <MetricCard title="Avg Expense" value={`৳${s.averageExpense.toLocaleString()}`} icon={PiggyBank as LucideIcon} color="slate" />
        </div>
      );
    }
    case 'attendance': {
      const s = (data as AttendanceReport).summary;
      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard title="Present" value={s.present} icon={UserCheck as LucideIcon} color="green" />
          <MetricCard title="Absent" value={s.absent} icon={UserX as LucideIcon} color="red" />
          <MetricCard title="Late" value={s.late} icon={Clock as LucideIcon} color="yellow" />
          <MetricCard title="Half-Day" value={s.halfDay} icon={SunDim as LucideIcon} color="blue" />
          <MetricCard title="Total Staff" value={s.totalStaff} icon={Users as LucideIcon} color="slate" />
          <MetricCard title="Attendance Rate" value={`${s.overallAttendanceRate}%`} icon={Percent as LucideIcon} color="slate" />
        </div>
      );
    }
  }
}
