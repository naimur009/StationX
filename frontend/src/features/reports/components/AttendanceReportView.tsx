'use client';

import { DataTable, type Column } from '@/components/shared/DataTable';
import ReportSummaryCards from './ReportSummaryCards';
import type { AttendanceReport, StaffAttendanceEntry, DailyAttendanceEntry } from '../api';

interface AttendanceReportViewProps {
  data: AttendanceReport;
}

export default function AttendanceReportView({ data }: AttendanceReportViewProps) {
  const staffColumns: Column<StaffAttendanceEntry>[] = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role', className: 'capitalize' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'late', label: 'Late' },
    { key: 'halfDay', label: 'Half-Day' },
    { key: 'totalHours', label: 'Hours', render: (item) => `${item.totalHours}h` },
    { key: 'attendanceRate', label: 'Rate', render: (item) => `${item.attendanceRate}%` },
  ];

  const dailyColumns: Column<DailyAttendanceEntry>[] = [
    { key: 'date', label: 'Date' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'late', label: 'Late' },
    { key: 'halfDay', label: 'Half-Day' },
  ];

  return (
    <div className="space-y-6">
      <ReportSummaryCards type="attendance" data={data} />

      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">By Staff</h3>
          <DataTable
            columns={staffColumns}
            data={data.byStaff}
            keyExtractor={(item) => item.userId}
            emptyMessage="No staff attendance data for this period."
          />
        </div>

        <div>
          <h3 className="mb-3 text-base font-bold text-slate-800">Daily Trend</h3>
          <DataTable
            columns={dailyColumns}
            data={data.dailyTrend}
            keyExtractor={(item) => item.date}
            emptyMessage="No daily attendance data for this period."
          />
        </div>
      </div>
    </div>
  );
}
