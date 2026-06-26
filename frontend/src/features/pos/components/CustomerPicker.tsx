'use client';

import { useState } from 'react';
import { usePosStore } from '../store';
import { useSaveOrFindCustomer } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, X } from 'lucide-react';
import { AppError } from '@/lib/utils';

export default function CustomerPicker() {
  const customer = usePosStore((s) => s.customer);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const mutation = useSaveOrFindCustomer();

  async function handleSubmit() {
    setError('');
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    try {
      const result = await mutation.mutateAsync({ phone: phone.trim(), name: name.trim() || phone.trim() });
      setCustomer({ id: result.data.id, name: result.data.name, phone: result.data.phone });
      setOpen(false);
      setPhone('');
      setName('');
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Failed to save customer');
    }
  }

  function handleClear() {
    setCustomer(null);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {customer ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm">
            <User className="h-4 w-4 text-slate-500" />
            <span className="text-slate-700">{customer.name}</span>
            <span className="text-xs text-slate-400">({customer.phone})</span>
            <button onClick={handleClear} className="ml-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-primary hover:text-primary"
          >
            <User className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Find or Create Customer"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone *</label>
            <Input
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name (optional)</label>
            <Input
              placeholder="Enter customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </Dialog>
    </>
  );
}
