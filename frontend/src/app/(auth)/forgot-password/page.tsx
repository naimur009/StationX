'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schema';
import { useForgotPassword } from '@/features/auth/api';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    await forgotPasswordMutation.mutateAsync(data);
    setIsSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email to receive a reset link
          </p>
        </div>

        {isSent ? (
          <div className="text-center">
            <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              If that email exists, a reset link was sent. Please check your
              inbox.
            </div>
            <Link
              href="/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@restaurant.com"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.email ? 'border-red-400' : 'border-slate-300'
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending…
                </span>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
