import { NextResponse } from 'next/server';
import { fetchDataExtensions } from '@/src/lib/sfmcClient';
import { scanField } from '@/src/lib/piiScanner';
import { computeRisk } from '@/src/lib/riskScoring';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { deKey, fields } = body as { deKey?: string; fields?: Array<{ name: string; dataType?: string }> };

    let computedFields: Array<{ name: string; dataType?: string }> = [];
    if (Array.isArray(fields) && fields.length > 0) {
      computedFields = fields;
    } else if (deKey) {
      const des = await fetchDataExtensions();
      const de = des.find((d) => d.id === deKey || d.externalKey === deKey || d.name === deKey);
      if (!de) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      computedFields = de.fields.map((f) => ({ name: f.name, dataType: f.dataType }));
    } else {
      return NextResponse.json({ error: 'missing_input' }, { status: 400 });
    }

    const pii = computedFields.map((f) => scanField(f));
    const risk_score = computeRisk(pii, false);
    const risk_level = risk_score >= 70 ? 'High' : risk_score >= 40 ? 'Medium' : 'Low';
    return NextResponse.json({ risk_score, risk_level });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'risk_failed' }, { status: 500 });
  }
}
