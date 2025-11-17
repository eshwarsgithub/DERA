import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const de = await prisma.de.findUnique({ where: { id: params.id } });
    if (!de) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const [fields, relationships] = await Promise.all([
      prisma.de_field.findMany({ where: { deId: de.id } }),
      prisma.de_relationship.findMany({ where: { fromDeId: de.id } }),
    ]);
    return NextResponse.json({ de, fields, relationships });
  } catch {
    // Fallback sample
    return NextResponse.json({
      de: { id: params.id, name: 'Sample DE', riskScore: 55 },
      fields: [
        { id: 'f1', name: 'EmailAddress', dataType: 'Email', isPII: true, piiType: 'Email' },
        { id: 'f2', name: 'FirstName', dataType: 'Text', isPII: true, piiType: 'FirstName' },
      ],
      relationships: [],
    });
  }
}
