import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET() {
  try {
    const job = await prisma.scan_job.findFirst({ orderBy: { startedAt: 'desc' } });
    if (!job) return NextResponse.json({});
    return NextResponse.json(job);
  } catch {
    // If DB is not configured
    return NextResponse.json({ id: 'mock', status: 'unknown', mocked: true });
  }
}
