'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store/auth.store';
import { PageSpinner } from '@/components/ui/GlobalLoader';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  useEffect(() => {
    if (isRestoring) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, isRestoring, router]);

  if (isRestoring || !user) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
