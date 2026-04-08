'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api/endpoints';
import { toast } from '@/lib/store/toast.store';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setServerError(null);
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
      toast.success('Reset link sent — check your email');
    } catch {
      const msg = 'Something went wrong. Please try again.';
      setServerError(msg);
      toast.error(msg);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
          <p className="mt-2 text-sm text-gray-500">
            If that email is registered, a reset link has been sent.
          </p>
          <a href="/login" className="btn-primary mt-6">
            <span>Back to sign in</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Forgot password</h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter your email and we'll send a reset link.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input id="email" type="email" className="input" {...register('email')} />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            <span>{isSubmitting ? 'Sending…' : 'Send reset link'}</span>
          </button>

          <a
            href="/login"
            className="block text-center text-sm text-primary-600 hover:underline"
          >
            Back to sign in
          </a>
        </form>
      </div>
    </div>
  );
}
