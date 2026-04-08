'use client';

import { useEffect, useRef } from 'react';
import { authApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth.store';
import type { AuthUser } from '@/lib/store/auth.store';

/**
 * On app load, silently calls /auth/refresh to restore the session from
 * the httpOnly refresh-token cookie. If it fails, the user remains logged out.
 * Sets isRestoring = false once the attempt completes (success or failure)
 * so the rest of the app knows it's safe to render / redirect.
 */
export function SessionRestorer() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setRestoring = useAuthStore((s) => s.setRestoring);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    authApi
      .refresh()
      .then((res) => {
        const { accessToken } = res.data.data;
        // Set the token so the /employees/me call gets the Authorization header
        useAuthStore.getState().setAccessToken(accessToken);

        import('@/lib/api/endpoints').then(({ employeesApi }) => {
          employeesApi
            .getMe()
            .then((meRes) => {
              const user = meRes.data.data as AuthUser;
              setAuth(accessToken, user); // also sets isRestoring = false
            })
            .catch(() => {
              // Token obtained but profile fetch failed — still mark done
              setRestoring(false);
            });
        });
      })
      .catch(() => {
        // No valid cookie — user is not logged in, mark restore done
        setRestoring(false);
      });
  }, [setAuth, setRestoring]);

  return null;
}
