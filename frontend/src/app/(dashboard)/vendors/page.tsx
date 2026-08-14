'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import VendorList from '@/features/vendors/components/VendorList';
import VendorForm from '@/features/vendors/components/VendorForm';
import DeleteVendorDialog from './DeleteVendorDialog';
import type { VendorResponse } from '@/features/vendors/api';

export default function VendorsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorResponse | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<VendorResponse | null>(null);

  return (
    <PermissionGate module="vendors" action="view">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Vendors</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your suppliers and vendors
            </p>
          </div>
          <PermissionGate module="vendors" action="create">
            <Button variant="primary" size="md" className="self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
              Add Vendor
            </Button>
          </PermissionGate>
        </div>

        <VendorList
          onEdit={(vendor) => setEditVendor(vendor)}
          onDelete={(vendor) => setDeleteVendor(vendor)}
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
        <DeleteVendorDialog
          vendor={deleteVendor}
          onClose={() => setDeleteVendor(null)}
        />
      </div>
    </PermissionGate>
  );
}
