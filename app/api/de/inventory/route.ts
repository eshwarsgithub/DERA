import { NextResponse } from 'next/server';
import { fetchDataExtensions } from '@/src/lib/sfmcClient';
import { scanField } from '@/src/lib/piiScanner';
import { computeRisk } from '@/src/lib/riskScoring';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').toLowerCase();
    const sortBy = (searchParams.get('sortBy') || 'de_name') as 'de_name' | 'risk_score';
    const sortDir = (searchParams.get('sortDir') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const des = await fetchDataExtensions();
    let items = des.map((de) => {
      const fieldResults = de.fields.map((f) => scanField({ name: f.name, dataType: f.dataType }));
      const riskScore = computeRisk(fieldResults, false);
      const risk_level = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';
      return {
        de_name: de.name,
        de_key: de.id,
        bu: null,
        row_count: null,
        last_modified: null,
        pii_summary: {
          email: fieldResults.some((f) => f.piiType === 'Email'),
          phone: fieldResults.some((f) => f.piiType === 'Phone'),
          dob: fieldResults.some((f) => f.piiType === 'DOB'),
          address: fieldResults.some((f) => f.piiType === 'Address'),
        },
        risk_score: riskScore,
        risk_level,
        last_referenced: null,
        retention_policy: null,
      };
    });

    if (q) {
      items = items.filter((it) =>
        (it.de_name || '').toLowerCase().includes(q) || (it.de_key || '').toLowerCase().includes(q)
      );
    }
    items.sort((a: any, b: any) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      const res = av > bv ? 1 : -1;
      return sortDir === 'asc' ? res : -res;
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'inventory_failed' }, { status: 500 });
  }
}
