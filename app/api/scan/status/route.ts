import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  if (jobId === 'mock') {
    return NextResponse.json({ id: 'mock', status: 'success', mocked: true });
  }
  const job = await prisma.scan_job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(job);
}
