'use client';

import { useState } from 'react';
import { ClipboardCheck, CalendarDays, Clock } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';
import TodayAttendanceSheet from '@/features/attendance/components/TodayAttendanceSheet';
import AttendanceCalendar from '@/features/attendance/components/AttendanceCalendar';

type Tab = 'roll-call' | 'calendar';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'roll-call', label: 'Roll Call', icon: Clock },
  { key: 'calendar', label: 'Monthly Report', icon: CalendarDays },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('roll-call');

  return (
    <PermissionGate module="attendance" action="view">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary text-white shadow-lg shadow-primary/20">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Attendance</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Mark and manage staff attendance records
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-slate-50/50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all sm:flex-initial sm:px-5 ${
                  isActive
                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
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
