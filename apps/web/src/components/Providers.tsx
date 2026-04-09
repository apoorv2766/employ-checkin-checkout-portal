'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SessionRestorer } from './SessionRestorer';
import { Toaster } from './ui/Toaster';
import { GlobalLoader } from './ui/GlobalLoader';
import { Loader } from './ui/Loader';
import { useAuthStore } from '@/lib/store/auth.store';

function SessionGate({ children }: { children: React.ReactNode }) {
  const isRestoring = useAuthStore((s) => s.isRestoring);
  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoader />
      <Toaster />
      <SessionRestorer />
      <SessionGate>{children}</SessionGate>
    </QueryClientProvider>
  );
}
