'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import EmployeeList from '@/features/employees/components/EmployeeList';
import EmployeeForm from '@/features/employees/components/EmployeeForm';
import DeleteEmployeeDialog from './DeleteEmployeeDialog';
import type { EmployeeResponse } from '@/features/employees/api';

export default function EmployeesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeResponse | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeResponse | null>(null);

  return (
    <PermissionGate module="employees" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Employees</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage restaurant staff and their salary information
            </p>
          </div>
          <PermissionGate module="employees" action="create">
            <Button variant="primary" size="md" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Employee
            </Button>
          </PermissionGate>
        </div>

        <EmployeeList
          onEdit={(employee) => setEditEmployee(employee)}
          onDelete={(employee) => setDeleteEmployee(employee)}
        />

        <EmployeeForm
          open={formOpen}
          employee={null}
          onClose={() => setFormOpen(false)}
        />
        <EmployeeForm
          open={!!editEmployee}
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
        />
        <DeleteEmployeeDialog
          employee={deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
        />
      </div>
    </PermissionGate>
  );
}
