'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import UserList from '@/features/users/components/UserList';
import CreateUserForm from '@/features/users/components/CreateUserForm';
import EditUserForm from '@/features/users/components/EditUserForm';
import DeactivateConfirmDialog from '@/features/users/components/DeactivateConfirmDialog';
import type { UserResponse } from '@/features/users/api';

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserResponse | null>(null);
  const [permanentDeleteUser, setPermanentDeleteUser] = useState<UserResponse | null>(null);

  return (
    <PermissionGate module="users" action="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Users &amp; Permissions</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage team accounts and module-level permissions
            </p>
          </div>
          <PermissionGate module="users" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Create User
            </Button>
          </PermissionGate>
        </div>

        <UserList
          onEdit={(user) => setEditUser(user)}
          onDeactivate={(user) => setDeactivateUser(user)}
          onPermanentDelete={(user) => setPermanentDeleteUser(user)}
        />

        <CreateUserForm open={createOpen} onClose={() => setCreateOpen(false)} />
        <EditUserForm user={editUser} onClose={() => setEditUser(null)} />
        <DeactivateConfirmDialog user={deactivateUser} onClose={() => setDeactivateUser(null)} />
        <DeactivateConfirmDialog
          user={permanentDeleteUser}
          permanent
          onClose={() => setPermanentDeleteUser(null)}
        />
      </div>
    </PermissionGate>
  );
}
