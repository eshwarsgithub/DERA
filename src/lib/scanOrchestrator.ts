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
    
    // Process all DEs and prepare batch data
    const deDataList: Array<{
      id: string;
      name: string;
      fieldData: Array<{
        name: string;
        dataType: string;
        isPII: boolean;
        piiType: string | null;
        sensitivityScore: number;
      }>;
    }> = [];

    for (const de of des) {
      const fieldResults = de.fields.map((f) => ({ f, r: scanField({ name: f.name, dataType: f.dataType }) }));
      
      deDataList.push({
        id: de.id,
        name: de.name,
        fieldData: fieldResults.map(({ f, r }) => ({
          name: f.name,
          dataType: (f.dataType ?? 'Unknown'),
          isPII: r.isPII,
          piiType: (r.piiType as string) ?? null,
          sensitivityScore: r.sensitivityScore,
        })),
      });
    }

    // Use transaction for batch operations to reduce round-trips
    await prisma.$transaction(async (tx) => {
      for (const deData of deDataList) {
        // Upsert DE
        const dbDe = await tx.de.upsert({
          where: { id: deData.id },
          update: { name: deData.name },
          create: { id: deData.id, name: deData.name, riskScore: 0, isOrphan: false },
        });

        // Delete existing fields and create new ones
        await tx.de_field.deleteMany({ where: { deId: dbDe.id } });
        
        if (deData.fieldData.length > 0) {
          await tx.de_field.createMany({
            data: deData.fieldData.map((fd) => ({
              deId: dbDe.id,
              name: fd.name,
              dataType: fd.dataType as any,
              isPII: fd.isPII,
              piiType: fd.piiType as any,
              sensitivityScore: fd.sensitivityScore,
            })),
          });
        }

        // Recalculate risk with actual lastReferencedAt from DB
        const isOrphan = inferIsOrphan(dbDe.lastReferencedAt);
        const risk = computeRisk(
          deData.fieldData.map((fd) => ({
            isPII: fd.isPII,
            piiType: fd.piiType as any,
            sensitivityScore: fd.sensitivityScore,
          })),
          isOrphan
        );
        
        await tx.de.update({ where: { id: dbDe.id }, data: { isOrphan, riskScore: risk } });
      }
    });

    await prisma.scan_job.update({ where: { id: job.id }, data: { status: 'success', completedAt: new Date() } });
  } catch (e: any) {
    await prisma.scan_job.update({ where: { id: job.id }, data: { status: 'failed', completedAt: new Date(), error: String(e?.message ?? e) } });
  }
  return prisma.scan_job.findUnique({ where: { id: job.id } });
}
