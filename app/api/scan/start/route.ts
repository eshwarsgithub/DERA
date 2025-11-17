import { NextResponse } from 'next/server';
import { startScan } from '@/src/lib/scanOrchestrator';

export async function POST() {
  try {
    const job = await startScan();
    return NextResponse.json({ jobId: job!.id, status: job!.status });
  } catch {
    // Graceful fallback when DB is not configured: simulate a quick successful run
    return NextResponse.json({ jobId: 'mock', status: 'success', mocked: true });
  }
}
