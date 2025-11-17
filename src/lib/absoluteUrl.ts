import { headers } from 'next/headers';

// Builds an absolute base URL for server-side fetches, honoring proxies and dev ports.
export function getBaseUrl(): string {
  // If explicitly provided, prefer env (useful in some hosting envs)
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase && /^https?:\/\//i.test(envBase)) return envBase.replace(/\/$/, '');

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}
