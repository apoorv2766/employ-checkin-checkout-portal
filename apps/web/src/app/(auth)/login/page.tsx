'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { authApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth.store';
import { toast } from '@/lib/store/toast.store';
import type { AuthUser } from '@/lib/store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

// â”€â”€ Right-panel illustration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HeroPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full px-12 py-14 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #4a00e0 0%, #8e2de2 50%, #c850c0 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #c850c0 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 60%)' }} />


      {/* Central illustration */}
      <div className="relative z-10 flex flex-col items-center gap-6 my-auto">
        {/* Main SVG illustration */}
        <svg viewBox="0 0 340 280" className="w-72 drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Dashboard card background */}
          <rect x="20" y="20" width="300" height="200" rx="20" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.25" strokeWidth="1.5"/>

          {/* Header bar */}
          <rect x="20" y="20" width="300" height="48" rx="20" fill="white" fillOpacity="0.18"/>
          <rect x="20" y="52" width="300" height="16" fill="white" fillOpacity="0.18"/>

          {/* Avatar circles in header */}
          <circle cx="56" cy="44" r="14" fill="#c850c0" fillOpacity="0.8"/>
          <circle cx="56" cy="40" r="6" fill="white" fillOpacity="0.9"/>
          <ellipse cx="56" cy="52" rx="9" ry="5" fill="white" fillOpacity="0.7"/>

          {/* Header text lines */}
          <rect x="80" y="36" width="80" height="8" rx="4" fill="white" fillOpacity="0.7"/>
          <rect x="80" y="48" width="50" height="5" rx="2.5" fill="white" fillOpacity="0.4"/>

          {/* Status badge */}
          <rect x="260" y="36" width="45" height="18" rx="9" fill="#10b981" fillOpacity="0.85"/>
          <text x="282.5" y="48.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">Active</text>

          {/* Check-in time card */}
          <rect x="36" y="84" width="84" height="68" rx="12" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>
          <rect x="44" y="95" width="28" height="28" rx="8" fill="#8e2de2" fillOpacity="0.7"/>
          {/* Clock icon inside */}
          <circle cx="58" cy="109" r="9" stroke="white" strokeWidth="1.5" fill="none"/>
          <line x1="58" y1="104" x2="58" y2="109" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="58" y1="109" x2="62" y2="111" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="44" y="130" width="52" height="7" rx="3.5" fill="white" fillOpacity="0.6"/>
          <rect x="44" y="141" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.35"/>

          {/* Attendance bar chart */}
          <rect x="136" y="84" width="168" height="68" rx="12" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>
          <rect x="149" y="96" width="70" height="6" rx="3" fill="white" fillOpacity="0.5"/>
          {/* Bars */}
          <rect x="149" y="115" width="16" height="28" rx="4" fill="#10b981" fillOpacity="0.8"/>
          <rect x="171" y="120" width="16" height="23" rx="4" fill="#10b981" fillOpacity="0.6"/>
          <rect x="193" y="108" width="16" height="35" rx="4" fill="#8e2de2" fillOpacity="0.8"/>
          <rect x="215" y="118" width="16" height="25" rx="4" fill="#10b981" fillOpacity="0.6"/>
          <rect x="237" y="112" width="16" height="31" rx="4" fill="#c850c0" fillOpacity="0.8"/>
          <rect x="260" y="125" width="16" height="18" rx="4" fill="#f59e0b" fillOpacity="0.8"/>

          {/* Bottom stat cards */}
          <rect x="36" y="164" width="84" height="42" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>
          <rect x="136" y="164" width="78" height="42" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>
          <rect x="226" y="164" width="78" height="42" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>

          <rect x="46" y="173" width="32" height="7" rx="3" fill="white" fillOpacity="0.4"/>
          <rect x="46" y="184" width="52" height="8" rx="4" fill="white" fillOpacity="0.75"/>
          <rect x="146" y="173" width="32" height="7" rx="3" fill="white" fillOpacity="0.4"/>
          <rect x="146" y="184" width="40" height="8" rx="4" fill="#10b981" fillOpacity="0.85"/>
          <rect x="236" y="173" width="32" height="7" rx="3" fill="white" fillOpacity="0.4"/>
          <rect x="236" y="184" width="40" height="8" rx="4" fill="#f59e0b" fillOpacity="0.85"/>

          {/* Floating check-in pill */}
          <rect x="60" y="230" width="140" height="36" rx="18" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
          <circle cx="83" cy="248" r="10" fill="#10b981" fillOpacity="0.9"/>
          <path d="M78 248l3.5 3.5 5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="102" y="241" width="60" height="6" rx="3" fill="white" fillOpacity="0.7"/>
          <rect x="102" y="251" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.4"/>
        </svg>

        {/* Tagline */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Track. Manage.<br />Thrive.
          </h2>
          <p className="mt-3 text-white/70 text-sm max-w-xs leading-relaxed">
            One platform to manage attendance, shifts, and workforce analytics â€” all in real time.
          </p>
        </div>

        {/* Floating stat pills */}
        <div className="flex gap-3 flex-wrap justify-center">
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <span className="text-green-300 text-base">â—</span>
            <span className="text-white text-xs font-medium">Real-time check-in</span>
          </div>
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <span className="text-yellow-300 text-base">â—</span>
            <span className="text-white text-xs font-medium">Smart reports</span>
          </div>
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <span className="text-pink-300 text-base">â—</span>
            <span className="text-white text-xs font-medium">Role-based access</span>
          </div>
        </div>
      </div>

      {/* Footer quote */}
      <div className="relative z-10 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-sm p-5">
        <p className="text-white/80 text-sm italic leading-relaxed">
          &ldquo;Streamlining attendance has never been this seamless. Our HR team saves hours every week.&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-xs">SR</div>
          <div>
            <p className="text-white text-xs font-semibold">Sarah R.</p>
            <p className="text-white/50 text-xs">HR Director, TechCorp</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Login form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const res = await authApi.login(values.email, values.password, values.rememberMe);
      const { accessToken, user } = res.data.data as { accessToken: string; user: AuthUser };
      setAuth(accessToken, user);

      toast.success(`Welcome back, ${user.firstName}!`);
      setLoginSuccess(true);

      await new Promise<void>((resolve) => setTimeout(resolve, 1500));

      const from = searchParams.get('from');
      if (from && from !== '/') {
        router.replace(from);
      } else if (user.role === 'admin' || user.role === 'manager') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: unknown) {
      const apiMsg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message;
      const status = (err as { response?: { status?: number } })?.response?.status;
      let message = apiMsg ?? 'Login failed. Please try again.';
      if (status === 401 || apiMsg?.toLowerCase().includes('invalid')) {
        message = 'Credentials not matched. Please try again.';
      } else if (status === 429) {
        message = apiMsg ?? 'Too many attempts. Please try later.';
      }
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* â”€â”€ Left: form column â”€â”€ */}
      <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 bg-white">
        {/* Mobile brand (hidden on desktop â€” shown in right panel) */}

        <div className="w-full max-w-sm mx-auto">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hello there! 👋</h1>
            <p className="mt-2 text-gray-500 text-sm">Sign in to the Portal</p>
          </div>

          {/* Error banner */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Your work email"
                  className="input pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-7 0-1.065.38-2.05 1.02-2.87M6.343 6.343A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 7a9.965 9.965 0 01-4.343 5.657M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center justify-end gap-2.5 cursor-pointer select-none">
              <span className="text-sm text-gray-500">Remember Me</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                {...register('rememberMe')}
              />
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary w-full py-3 text-sm ${loginSuccess ? 'btn-success' : ''}`}
            >
              <span>
                {(() => {
                  if (loginSuccess) return '✓ Login successful! Redirecting…';
                  if (isSubmitting) return 'Signing in…';
                  return 'Sign in to Portal';
                })()}
              </span>
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Need help with policy support? 
            <span className="text-primary-600 hover:text-primary-700 hover:underline inline-block ml-1">
              Contact Support!
            </span>
          </p>
        </div>
      </div>

      {/* ── Right: illustration panel ── */}
      <HeroPanel />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
