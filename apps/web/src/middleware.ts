import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];
const ADMIN_PATHS = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths always
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for refresh token cookie as a proxy for "logged in"
  // (access token is in-memory; we can't inspect it here without JWS verify)
  const hasSession = request.cookies.has('refreshToken');

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route guard — role is in the JWT but we'd need to decode it here.
  // Decoding without verify is acceptable in middleware since the API enforces roles.
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    if (refreshToken) {
      try {
        const [, payloadB64] = refreshToken.split('.');
        if (payloadB64) {
          // Middleware runs on Edge — use atob
          const payload = JSON.parse(atob(payloadB64)) as Record<string, unknown>;
          // Refresh token payload only has sub/jti, not role.
          // Role check is done client-side after session restore.
          // API enforces it server-side always.
          void payload;
        }
      } catch {
        // Ignore — API enforces role anyway
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - /api/v1/* (proxied backend API calls — must never be redirected to login)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/v1).*)',
  ],
};
