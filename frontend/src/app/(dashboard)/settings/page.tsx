'use client';

import PermissionGate from '@/components/shared/PermissionGate';
import BusinessInfoSection from '@/features/settings/components/BusinessInfoSection';
import TaxSection from '@/features/settings/components/TaxSection';
import BusinessHoursSection from '@/features/settings/components/BusinessHoursSection';
import LogoSettingsSection from '@/features/settings/components/LogoSettingsSection';
import LoyaltyDiscountSection from '@/features/settings/components/LoyaltyDiscountSection';
import TableSettingsSection from '@/features/settings/components/TableSettingsSection';
import DataManagementSection from '@/features/settings/components/DataManagementSection';

export default function SettingsPage() {
  return (
    <PermissionGate module="settings" action="view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage restaurant configuration</p>
        </div>

        <BusinessInfoSection />
        <TaxSection />
        <BusinessHoursSection />
        <LoyaltyDiscountSection />
        <TableSettingsSection />
        <LogoSettingsSection />
        <DataManagementSection />
      </div>
    </PermissionGate>
  );
}
