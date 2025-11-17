import { NextResponse } from 'next/server';
import { GET as getMindmap } from '@/app/api/de/mindmap/route';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const deKey = url.searchParams.get('deKey');
    if (!deKey) return NextResponse.json({ error: 'missing_deKey' }, { status: 400 });
    const res = await getMindmap(req);
    const data = await res.json();
    const summary = {
      de: data.de,
      inboundCount: (data.inbound || []).length,
      outboundCount: (data.outbound || []).length,
      transformationCount: (data.transformations || []).length,
      suggestions: buildSuggestions(data),
    };
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'report_failed' }, { status: 500 });
  }
}

function buildSuggestions(data: any): string[] {
  const out: string[] = [];
  if (data?.de?.risk_level === 'High') out.push('Review PII exposure and access controls.');
  if ((data?.outbound || []).length === 0) out.push('DE appears unused downstream — consider cleanup if stale.');
  if ((data?.inbound || []).length > 3) out.push('Multiple inbound sources — validate transformation and retention.');
  return out;
}
