'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ReportType } from './schema';

// ---- Response Types ----

export interface ReportRange {
  from: string;
  to: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  totalProductsSold: number;
  totalDiscountAmount: number;
  totalTaxAmount: number;
  averageOrderValue: number;
  discountPercentage: number;
}

export interface PaymentMethodEntry {
  count: number;
  revenue: number;
}

export interface DailySalesEntry {
  date: string;
  orders: number;
  revenue: number;
}

export interface ProductIncomeEntry {
  productId: string;
  name: string;
  category: string;
  unitsSold: number;
  income: number;
  percentageOfTotal: number;
  orderCount: number;
}

export interface CategoryIncomeEntry {
  category: string;
  unitsSold: number;
  income: number;
}

export interface SalesReport {
  range: ReportRange;
  summary: SalesSummary;
  byPaymentMethod: Record<string, PaymentMethodEntry>;
  dailyBreakdown: DailySalesEntry[];
  byProduct: ProductIncomeEntry[];
  byCategory: CategoryIncomeEntry[];
}

export interface CategoryExpenseEntry {
  category: string;
  count: number;
  total: number;
}

export interface MiscIncomeCategory {
  category: string;
  count: number;
  total: number;
}

export interface ProfitIncome {
  totalRevenue: number;
  totalOrders: number;
  totalProductsSold: number;
  totalMiscIncome: number;
  miscEntries: number;
  byMiscCategory: MiscIncomeCategory[];
}

export interface ProfitExpenses {
  totalExpenses: number;
  totalEntries: number;
  byCategory: CategoryExpenseEntry[];
}

export interface SalaryEmployeeEntry {
  employeeName: string;
  totalPaid: number;
  status: string;
}

export interface ProfitSalaries {
  totalPaid: number;
  totalRecords: number;
  byEmployee: SalaryEmployeeEntry[];
}

export interface ProfitReport {
  range: ReportRange;
  income: ProfitIncome;
  expenses: ProfitExpenses;
  salaries: ProfitSalaries;
  profit: number;
}

export type ReportData = SalesReport | ProfitReport;

// ---- Hooks ----

export function useReport(type: ReportType, range: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  params.set('range', range);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();

  const isValid = range !== 'custom' || (!!from && !!to);

  return useQuery({
    queryKey: ['reports', type, qs],
    queryFn: () => apiClient<{ data: ReportData }>(`/reports/${type}?${qs}`),
    enabled: isValid,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      type,
      range,
      from,
      to,
    }: {
      type: ReportType;
      range: string;
      from?: string;
      to?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('range', range);
      params.set('format', 'pdf');
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = (await import('@/stores/auth-store')).useAuthStore.getState().accessToken;

      const response = await fetch(`${API_BASE}/reports/${type}/export?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `${type}-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}
