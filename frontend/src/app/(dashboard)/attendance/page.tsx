'use client';

import { useState } from 'react';
import { ClipboardCheck, Clock, CalendarRange } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';
import TodayAttendanceSheet from '@/features/attendance/components/TodayAttendanceSheet';
import AttendanceCalendar from '@/features/attendance/components/AttendanceCalendar';

type Tab = 'roll-call' | 'calendar';

const TABS: { key: Tab; label: string; description: string; icon: React.ElementType }[] = [
  { key: 'roll-call', label: 'Roll Call', description: 'Mark today\u2019s attendance', icon: Clock },
  { key: 'calendar', label: 'Monthly Report', description: 'Per-staff monthly view', icon: CalendarRange },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('roll-call');

  return (
    <PermissionGate module="attendance" action="view">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary text-white shadow-lg shadow-primary/20 sm:h-12 sm:w-12">
            <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Attendance</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Mark and manage staff attendance records
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 rounded-2xl border border-border bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
                title={tab.description}
                className={`group flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:flex-initial sm:px-6 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'roll-call' && <TodayAttendanceSheet />}
        {activeTab === 'calendar' && <AttendanceCalendar />}
      </div>
    </PermissionGate>
  );
}