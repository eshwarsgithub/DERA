import { NextResponse } from 'next/server';
import { fetchDataExtensions } from '@/src/lib/sfmcClient';
import { scanField } from '@/src/lib/piiScanner';
import { computeRisk } from '@/src/lib/riskScoring';

export const revalidate = 0;

export async function GET(_: Request, { params }: { params: { deKey: string } }) {
  try {
    const key = decodeURIComponent(params.deKey);
    const des = await fetchDataExtensions();
    const de = des.find((d) => d.id === key || d.externalKey === key || d.name === key);
    if (!de) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const fields = de.fields.map((f) => ({ name: f.name, dataType: f.dataType }));
    const pii = fields.map((f) => scanField(f));
    const risk_score = computeRisk(pii, false);
    const risk_level = risk_score >= 70 ? 'High' : risk_score >= 40 ? 'Medium' : 'Low';

    return NextResponse.json({
      de: {
        key: de.id,
        name: de.name,
        pii_summary: {
          email: pii.some((p) => p.piiType === 'Email'),
          phone: pii.some((p) => p.piiType === 'Phone'),
          dob: pii.some((p) => p.piiType === 'DOB'),
          address: pii.some((p) => p.piiType === 'Address'),
        },
        risk_level,
        risk_score,
        fields,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'fetch_failed' }, { status: 500 });
  }
}
