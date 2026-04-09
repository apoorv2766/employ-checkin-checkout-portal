'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';

/** Root → redirect based on role once the session is known. */
export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  useEffect(() => {
    if (isRestoring) return; // wait until session restore settles
    if (user?.role === 'admin' || user?.role === 'manager') {
      router.replace('/admin/dashboard');
    } else if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, isRestoring, router]);

  return null;
}
