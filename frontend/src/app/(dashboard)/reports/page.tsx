'use client';

import { useState } from 'react';
import PermissionGate from '@/components/shared/PermissionGate';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import ReportTypeSelector from '@/features/reports/components/ReportTypeSelector';
import ExportButton from '@/features/reports/components/ExportButton';
import SalesReportView from '@/features/reports/components/SalesReportView';
import IncomeReportView from '@/features/reports/components/IncomeReportView';
import ExpenseReportView from '@/features/reports/components/ExpenseReportView';
import AttendanceReportView from '@/features/reports/components/AttendanceReportView';
import { useReport } from '@/features/reports/api';
import type { ReportType } from '@/features/reports/schema';
import type { SalesReport, IncomeReport, ExpenseReport, AttendanceReport } from '@/features/reports/api';

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('sales');
  const { filter, setRange, setCustomRange, queryString } = useDateRangeFilter('month');

  const { data, isLoading, isError, error } = useReport(
    selectedType,
    filter.range,
    filter.from,
    filter.to
  );

  function handleTypeChange(type: ReportType) {
    setSelectedType(type);
    setRange('month');
  }

  function renderReportView() {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border overflow-x-auto">
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : 'Failed to load report data.'}
          </p>
        </div>
      );
    }

    if (!data?.data) {
      return (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-slate-400">No data available for this period.</p>
        </div>
      );
    }

    switch (selectedType) {
      case 'sales':
        return <SalesReportView data={data.data as SalesReport} />;
      case 'income':
        return <IncomeReportView data={data.data as IncomeReport} />;
      case 'expense':
        return <ExpenseReportView data={data.data as ExpenseReport} />;
      case 'attendance':
        return <AttendanceReportView data={data.data as AttendanceReport} />;
    }
  }

  return (
    <PermissionGate module="reports" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <ExportButton
            type={selectedType}
            range={filter.range}
            from={filter.from}
            to={filter.to}
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ReportTypeSelector selected={selectedType} onChange={handleTypeChange} />
          <DateRangeFilter
            value={filter.range}
            onChange={setRange}
            onCustomRange={setCustomRange}
          />
        </div>

        {renderReportView()}
      </div>
    </PermissionGate>
  );
}
