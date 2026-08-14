'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Phone, Mail, MapPin, User, Calendar } from 'lucide-react';
import { useVendor, useDeleteVendor, type VendorResponse } from '../api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import PermissionGate from '@/components/shared/PermissionGate';
import { AppError } from '@/lib/utils';

interface VendorDetailProps {
  vendorId: string;
  onEdit: (vendor: VendorResponse) => void;
}

export default function VendorDetail({ vendorId, onEdit }: VendorDetailProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteVendor = useDeleteVendor();

  const { data, isLoading, isError } = useVendor(vendorId);

  const vendor = data?.data;

  async function handleDelete() {
    if (!vendor) return;
    setDeleteError(null);

    try {
      await deleteVendor.mutateAsync(vendor.id);
      setDeleteOpen(false);
      router.push('/vendors');
    } catch (err) {
      if (err instanceof AppError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete vendor');
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
        <p className="text-sm text-red-600">
          {isError ? 'Failed to load vendor details.' : 'Vendor not found.'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push('/vendors')}
        >
          Back to Vendors
        </Button>
      </div>
    );
  }

  const contactFields = [
    { label: 'Contact Person', value: vendor.contactPerson, icon: User },
    { label: 'Phone', value: vendor.phone, icon: Phone },
    { label: 'Email', value: vendor.email, icon: Mail },
    { label: 'Address', value: vendor.address, icon: MapPin },
  ];

  const hasContactInfo = contactFields.some((f) => f.value);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push('/vendors')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendors
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 sm:h-12 sm:w-12">
              <Building2 className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-slate-800 sm:text-2xl">{vendor.name}</h1>
              {vendor.phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Phone className="h-3.5 w-3.5" />
                  {vendor.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PermissionGate module="vendors" action="edit">
              <Button variant="primary" size="md" onClick={() => onEdit(vendor)}>
                Edit Vendor
              </Button>
            </PermissionGate>
            <PermissionGate module="vendors" action="delete">
              <Button
                variant="destructive"
                size="md"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                Delete
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Contact information */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-bold text-slate-800">Contact Information</h2>
        {hasContactInfo ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactFields.map((field) => {
              if (!field.value) return null;
              const Icon = field.icon;
              return (
                <div key={field.label} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{field.label}</p>
                    <p className="break-words text-sm text-slate-700">{field.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No contact information provided.</p>
        )}
      </div>

      {/* Items supplied */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Items Supplied</h2>
          {vendor.itemsSupplied.length > 0 && (
            <span className="text-xs font-medium text-slate-400">{vendor.itemsSupplied.length} items</span>
          )}
        </div>
        {vendor.itemsSupplied.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {vendor.itemsSupplied.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No items specified.</p>
        )}
      </div>

      {/* Metadata */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-bold text-slate-800">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Created</p>
              <p className="text-sm text-slate-700">
                {new Date(vendor.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Last Updated</p>
              <p className="text-sm text-slate-700">
                {new Date(vendor.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        title="Delete Vendor"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => { setDeleteOpen(false); setDeleteError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleDelete}
              disabled={deleteVendor.isPending}
            >
              {deleteVendor.isPending ? 'Deleting\u2026' : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {deleteError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-slate-800">{vendor.name}</span>? This action cannot be undone.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
