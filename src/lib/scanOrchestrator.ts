import { prisma } from './db';
import { fetchDataExtensions } from './sfmcClient';
import { scanField } from './piiScanner';
import { inferIsOrphan } from './usageResolver';
import { computeRisk } from './riskScoring';

export async function startScan() {
  const job = await prisma.scan_job.create({
    data: { status: 'running', startedAt: new Date() },
  });
  // Run in-line (MVP); in future, offload to background worker
  try {
    const des = await fetchDataExtensions();
    for (const de of des) {
      // upsert de
      const dbDe = await prisma.de.upsert({
        where: { id: de.id },
        update: { name: de.name },
        create: { id: de.id, name: de.name, riskScore: 0, isOrphan: false },
      });
      // fields
      const fieldResults = de.fields.map((f) => ({ f, r: scanField({ name: f.name, dataType: f.dataType }) }));
      // replace fields for simplicity
      await prisma.de_field.deleteMany({ where: { deId: dbDe.id } });
      await prisma.de_field.createMany({
        data: fieldResults.map(({ f, r }) => ({
          deId: dbDe.id,
          name: f.name,
          dataType: (f.dataType ?? 'Unknown') as any,
          isPII: r.isPII,
          piiType: (r.piiType as any) ?? null,
          sensitivityScore: r.sensitivityScore,
        })),
      });
      const isOrphan = inferIsOrphan(dbDe.lastReferencedAt);
      const risk = computeRisk(fieldResults.map((x) => x.r), isOrphan);
      await prisma.de.update({ where: { id: dbDe.id }, data: { isOrphan, riskScore: risk } });
    }
    await prisma.scan_job.update({ where: { id: job.id }, data: { status: 'success', completedAt: new Date() } });
  } catch (e: any) {
    await prisma.scan_job.update({ where: { id: job.id }, data: { status: 'failed', completedAt: new Date(), error: String(e?.message ?? e) } });
  }
  return prisma.scan_job.findUnique({ where: { id: job.id } });
}
