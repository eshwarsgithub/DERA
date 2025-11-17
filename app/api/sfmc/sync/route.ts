import { NextResponse } from 'next/server';
import { startScan } from '@/src/lib/scanOrchestrator';

export const revalidate = 0;

export async function POST() {
  try {
    const res = await startScan();
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'sync_failed' }, { status: 500 });
  }
}
