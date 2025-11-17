import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Allow when auth is disabled or when NextAuth isn't configured in non-production
  const isDev = process.env.NODE_ENV !== 'production';
  const authDisabledFlag = process.env.AUTH_DISABLED === 'true';
  const nextAuthNotConfigured = !process.env.NEXTAUTH_SECRET || !process.env.GITHUB_ID || !process.env.GITHUB_SECRET;
  if (authDisabledFlag || (isDev && nextAuthNotConfigured)) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Always allow Next internals, auth routes, and APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/registry') ||
    pathname.startsWith('/api/de') ||
    pathname.startsWith('/api/scan') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  const loginUrl = new URL('/api/auth/signin', req.url);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/',
    '/des',
    '/des/:path*',
    '/mindmap',
  ],
};
