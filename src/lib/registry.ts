import { prisma } from './db';

export type RegistryItem = {
  de_name: string;
  de_key: string;
  bu?: string | null;
  row_count?: number | null;
  last_modified?: Date | string | null;
  pii_summary?: any;
  usage_summary?: any;
  risk_score?: number;
  risk_level?: string;
  last_referenced?: Date | string | null;
  retention_policy?: any;
};

export async function upsertRegistry(item: RegistryItem) {
  try {
    const client: any = prisma as any;
    const existing = await client.metadata_registry.findFirst({ where: { de_key: item.de_key } });
    if (existing) {
      await client.metadata_registry.update({
        where: { id: existing.id },
        data: normalize(item),
      });
      return existing.id;
    } else {
      const created = await client.metadata_registry.create({ data: normalize(item) });
      return created.id;
    }
  } catch {
    // Silent fail to keep API resilient without DB
    return null;
  }
}

export async function saveUsageEntries(deKey: string, entries: Array<{ object_type: string; object_name: string; direction: 'inbound' | 'outbound'; snippet?: string | null }>) {
  try {
    // Basic approach: delete and recreate recent entries for the DE
    const client: any = prisma as any;
    await client.usage_index.deleteMany({ where: { de_key: deKey } });
    if (!entries.length) return;
    await client.usage_index.createMany({
      data: entries.map((e) => ({
        de_key: deKey,
        object_type: e.object_type,
        object_name: e.object_name,
        direction: e.direction,
        snippet: e.snippet ?? null,
        last_seen: new Date(),
      })),
    });
  } catch {
    // ignore
  }
}

export async function saveTransformations(items: Array<{ query_id?: string; source_de_keys?: string[]; target_de_key?: string; mapping?: any; sql_text?: string; confidence?: string }>) {
  try {
    if (!items.length) return;
    const client: any = prisma as any;
    await client.transformations.createMany({
      data: items.map((t) => ({
        query_id: t.query_id ?? null,
        source_de_keys: t.source_de_keys ? (t.source_de_keys as any) : null,
        target_de_key: t.target_de_key ?? null,
        mapping: t.mapping ?? null,
        sql_text: t.sql_text ?? null,
        confidence: t.confidence ?? null,
      })),
    });
  } catch {
    // ignore
  }
}

function normalize(item: RegistryItem) {
  return {
    de_name: item.de_name,
    de_key: item.de_key,
    bu: item.bu ?? null,
    row_count: item.row_count ?? null,
    last_modified: item.last_modified ? new Date(item.last_modified) : null,
    pii_summary: item.pii_summary ?? null,
    usage_summary: item.usage_summary ?? null,
    risk_score: item.risk_score ?? null,
    risk_level: item.risk_level ?? null,
    last_referenced: item.last_referenced ? new Date(item.last_referenced) : null,
    retention_policy: item.retention_policy ?? null,
  };
}
