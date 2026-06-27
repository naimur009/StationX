'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import VendorList from '@/features/vendors/components/VendorList';
import VendorForm from '@/features/vendors/components/VendorForm';
import type { VendorResponse } from '@/features/vendors/api';

export default function VendorsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorResponse | null>(null);

  return (
    <PermissionGate module="vendors" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Vendors</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your suppliers and vendors
            </p>
          </div>
          <PermissionGate module="vendors" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Add Vendor
            </Button>
          </PermissionGate>
        </div>

        <VendorList
          onEdit={(vendor) => setEditVendor(vendor)}
          onDelete={(vendor) => setEditVendor(vendor)}
        />

        <VendorForm
          open={createOpen}
          vendor={null}
          onClose={() => setCreateOpen(false)}
        />
        <VendorForm
          open={!!editVendor}
          vendor={editVendor}
          onClose={() => setEditVendor(null)}
        />
      </div>
    </PermissionGate>
  );
}
