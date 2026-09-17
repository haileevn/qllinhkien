import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'h2t_super_secret_jwt_key_2026_home_inventory';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);
const AUTH_COOKIE_NAME = 'h2t_auth_token';

// Public paths that do not require login
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/system/init-db',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.ico',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, public routes, Next internals and uploads
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, encodedSecret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // If trying to access login while already authenticated -> redirect to dashboard
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If not authenticated
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
