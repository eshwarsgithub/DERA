import { NextRequest, NextResponse } from 'next/server';

export function authGuard(req: NextRequest) {
  const disabled = process.env.AUTH_DISABLED === 'true';
  if (disabled) return null; // allow
  // Placeholder: integrate NextAuth session check here
  const isAuthenticated = false;
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/api/auth/signin', req.url));
  }
  return null;
}
