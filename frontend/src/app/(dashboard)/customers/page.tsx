'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import CustomerList from '@/features/customers/components/CustomerList';
import CustomerForm from '@/features/customers/components/CustomerForm';
import DeleteCustomerDialog from './DeleteCustomerDialog';
import type { CustomerResponse } from '@/features/customers/api';

export default function CustomersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerResponse | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerResponse | null>(null);

  return (
    <PermissionGate module="customers" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Customers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your customer records
            </p>
          </div>
          <PermissionGate module="customers" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Create Customer
            </Button>
          </PermissionGate>
        </div>

        <CustomerList
          onEdit={(customer) => setEditCustomer(customer)}
          onDelete={(customer) => setDeleteCustomer(customer)}
          onCreate={() => setCreateOpen(true)}
        />

        <CustomerForm
          open={createOpen}
          customer={null}
          onClose={() => setCreateOpen(false)}
        />
        <CustomerForm
          open={!!editCustomer}
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
        />
        <DeleteCustomerDialog
          customer={deleteCustomer}
          onClose={() => setDeleteCustomer(null)}
        />
      </div>
    </PermissionGate>
  );
}
