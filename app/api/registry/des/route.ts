import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Number(searchParams.get('take') ?? 50);
  const skip = Number(searchParams.get('skip') ?? 0);
  const riskMin = Number(searchParams.get('riskMin') ?? 0);
  const riskMax = Number(searchParams.get('riskMax') ?? 100);
  const isOrphan = searchParams.get('isOrphan');
  const q = searchParams.get('q') ?? undefined;

  try {
    const where: any = {
      riskScore: { gte: riskMin, lte: riskMax },
      ...(isOrphan == null ? {} : { isOrphan: isOrphan === 'true' }),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.de.findMany({ where, skip, take, orderBy: { riskScore: 'desc' } }),
      prisma.de.count({ where }),
    ]);
    return NextResponse.json({ items, total, skip, take });
  } catch {
    // Fallback samples if DB not ready
    return NextResponse.json({
      items: [
        { id: 'sample-1', name: 'Contacts', riskScore: 65, isOrphan: false },
        { id: 'sample-2', name: 'Leads_Archive', riskScore: 72, isOrphan: true },
      ],
      total: 2,
      skip: 0,
      take: 50,
    });
  }
}
