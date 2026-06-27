'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PermissionGate from '@/components/shared/PermissionGate';
import VendorDetail from '@/features/vendors/components/VendorDetail';
import VendorForm from '@/features/vendors/components/VendorForm';
import type { VendorResponse } from '@/features/vendors/api';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;
  const [editVendor, setEditVendor] = useState<VendorResponse | null>(null);

  return (
    <PermissionGate module="vendors" action="view">
      <VendorDetail
        vendorId={vendorId}
        onEdit={(vendor) => setEditVendor(vendor)}
      />
      <VendorForm
        open={!!editVendor}
        vendor={editVendor}
        onClose={() => setEditVendor(null)}
      />
    </PermissionGate>
  );
}
