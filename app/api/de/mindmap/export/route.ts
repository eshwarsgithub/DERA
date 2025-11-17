import { NextResponse } from 'next/server';
import { GET as getMindmap } from '@/app/api/de/mindmap/route';
import PDFDocument from 'pdfkit';

export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  if (format !== 'json' && format !== 'pdf') {
    return NextResponse.json({ error: 'unsupported_format' }, { status: 400 });
  }

  if (format === 'json') {
    const res = await getMindmap(req);
    const json = await res.json();
    return new NextResponse(JSON.stringify(json, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="mindmap.json"',
      },
    });
  }

  // Generate a minimal PDF summary of the mind map
  const res = await getMindmap(req);
  const data = await res.json();
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Uint8Array[] = [];
  const stream = doc as unknown as NodeJS.ReadableStream;
  stream.on('data', (c: any) => chunks.push(Buffer.from(c)));

  doc.fontSize(18).text(`DERA Mind Map`, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`DE: ${data?.de?.name ?? data?.de?.key ?? 'Unknown'}`);
  if (data?.de?.risk_level) doc.text(`Risk: ${data.de.risk_level}`);
  doc.moveDown(0.75);

  const section = (title: string) => {
    doc.moveDown(0.5);
    doc.fontSize(14).text(title, { continued: false });
    doc.moveDown(0.25);
  };

  section('Inbound');
  (data?.inbound ?? []).slice(0, 25).forEach((n: any, i: number) => {
    doc.fontSize(11).text(`${i + 1}. ${n.type}: ${n.name} ${n.context ? '(' + n.context + ')' : ''} [${n.confidence ?? ''}]`);
  });

  section('Outbound');
  (data?.outbound ?? []).slice(0, 25).forEach((n: any, i: number) => {
    doc.fontSize(11).text(`${i + 1}. ${n.type}: ${n.name} ${n.context ? '(' + n.context + ')' : ''} [${n.confidence ?? ''}]`);
  });

  section('Transformations');
  (data?.transformations ?? []).slice(0, 25).forEach((t: any, i: number) => {
    doc.fontSize(11).text(`${i + 1}. Query: ${t.query ?? t.name ?? 'Transform'} [${t.confidence ?? ''}]`);
  });

  doc.end();
  await new Promise((r) => stream.on('end', r));
  const blob = Buffer.concat(chunks);
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="mindmap.pdf"',
      'Content-Length': String(blob.length),
    },
  });
}
