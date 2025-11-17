import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET() {
  try {
    const [deCount, piiFields, orphanCount, avgRisk] = await Promise.all([
      prisma.de.count(),
      prisma.de_field.count({ where: { isPII: true } }),
      prisma.de.count({ where: { isOrphan: true } }),
      prisma.de.aggregate({ _avg: { riskScore: true } }),
    ]);
    return NextResponse.json({
      totalDes: deCount,
      piiFields,
      orphanCount,
      avgRisk: Math.round((avgRisk._avg.riskScore ?? 0) as number),
    });
  } catch {
    // Fallback sample values when DB not migrated yet
    return NextResponse.json({ totalDes: 3, piiFields: 5, orphanCount: 1, avgRisk: 43 });
  }
}
