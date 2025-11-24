import { NextResponse } from 'next/server';
import { fetchDataExtensions, fetchAutomations, fetchJourneys, fetchQueries, fetchCloudPages, fetchExports, fetchImports, fetchAssetContentById } from '@/src/lib/sfmcClient';
import { parseSqlRelationships, normalizeTable } from '@/src/lib/usage/sql';
import { saveTransformations, saveUsageEntries, upsertRegistry } from '@/src/lib/registry';
import { scanField } from '@/src/lib/piiScanner';
import { computeRisk } from '@/src/lib/riskScoring';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deKey = searchParams.get('deKey');
    if (!deKey) return NextResponse.json({ error: 'missing_deKey' }, { status: 400 });

    const des = await fetchDataExtensions();
    const de = des.find((d) => d.id === deKey || d.externalKey === deKey || d.name === deKey);
    if (!de) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const fields = de.fields.map((f) => ({ name: f.name, dataType: f.dataType }));
    const pii = fields.map((f) => scanField(f));
    const risk_score = computeRisk(pii, false);
    const risk_level = risk_score >= 70 ? 'High' : risk_score >= 40 ? 'Medium' : 'Low';

    const [autos, journeys, queries, pages, exportsList, importsList] = await Promise.all([
      fetchAutomations(),
      fetchJourneys(),
      fetchQueries(),
      fetchCloudPages(),
      fetchExports(),
      fetchImports(),
    ]);

    const inbounds: any[] = [];
    const outbounds: any[] = [];
    const transformations: any[] = [];

    // Build maps for quick matching (by id, externalKey, and name)
    const deNames = new Set<string>([
      (de.id || '').toLowerCase(),
      (de.externalKey || '').toLowerCase(),
      (de.name || '').toLowerCase(),
    ].filter(Boolean));

    // Imports: check destinationObject
    (importsList as any[]).forEach((imp) => {
      const destId = (imp.destinationObject?.id || '').toLowerCase();
      const destKey = (imp.destinationObject?.customerKey || '').toLowerCase();
      const destName = (imp.destinationObject?.name || '').toLowerCase();

      if (deNames.has(destId) || deNames.has(destKey) || deNames.has(destName)) {
        inbounds.push({ type: 'Import', name: imp.name, confidence: 'high' });
      }
    });

    // Queries: parse SQL; if selected DE is target -> inbound from sources; if selected DE is a source -> outbound to targets
    for (const q of queries as any[]) {
      const rel = parseSqlRelationships(q.queryText || '');
      const sources = rel.sources.map((x) => x.toLowerCase());
      const targets = rel.targets.map((x) => x.toLowerCase());
      const hitsTarget = targets.some((t) => deNames.has(t));
      const hitsSource = sources.some((s) => deNames.has(s));
      if (hitsTarget) {
        const inputs = rel.sources.map((s) => normalizeTable(s));
        inputs.forEach((s) => {
          if (!s) return;
          inbounds.push({ type: 'Query', name: q.name, sources: [s], confidence: 'high' });
        });
        transformations.push({ query: q.name, mapping: [], confidence: 'high' });
      } else if (hitsSource) {
        targets.forEach((t) => {
          outbounds.push({ type: 'Query', name: q.name, target: t, confidence: 'medium' });
        });
        transformations.push({ query: q.name, mapping: [], confidence: 'medium' });
      } else {
        // Fallback name match
        const text = String(q.queryText || '').toLowerCase();
        if (Array.from(deNames).some((n) => n && text.includes(n))) {
          transformations.push({ query: q.name, confidence: 'low' });
        }
      }
    }

    // Automations & Journeys: name-based heuristic for now
    autos.forEach((a: any) => {
      if ((a.name || '').toLowerCase().includes(de.name.toLowerCase())) {
        outbounds.push({ type: 'Automation', name: a.name, confidence: 'low' });
      }
    });
    journeys.forEach((j: any) => {
      if ((j.name || '').toLowerCase().includes(de.name.toLowerCase())) {
        outbounds.push({ type: 'Journey', name: j.name, context: 'EntrySource', confidence: 'low' });
      }
    });

    for (const p of pages as any[]) {
      const nameL = (p.name || '').toLowerCase();
      let matched = nameL && Array.from(deNames).some((n) => n && nameL.includes(n));
      // Try to fetch and parse AMPscript content if possible
      if (!matched && p.id) {
        const asset = await fetchAssetContentById(String(p.id));
        const html = String(asset?.content || asset?.views?.html || '');
        const ampRef = extractAmpScriptDeNames(html);
        if (ampRef.some((r) => deNames.has(r.toLowerCase()))) {
          matched = true;
        }
      }
      if (matched) {
        outbounds.push({ type: 'CloudPage', name: p.name, confidence: 'medium' });
      }
    }

    (exportsList as any[]).forEach((ex) => {
      if ((ex.name || '').toLowerCase().includes(de.name.toLowerCase())) {
        outbounds.push({ type: 'Export', name: ex.name, confidence: 'low' });
      }
    });

    const payload = {
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
      },
      inbound: inbounds,
      outbound: outbounds,
      transformations,
    };

    // Optional persistence: ?persist=1
    const persist = searchParams.get('persist') === '1' || searchParams.get('persist') === 'true';
    if (persist) {
      const usageEntries: Array<{ object_type: string; object_name: string; direction: 'inbound' | 'outbound'; snippet?: string | null }> = [];
      inbounds.forEach((n: any) => usageEntries.push({ object_type: n.type || 'Unknown', object_name: n.name || 'Unknown', direction: 'inbound' }));
      outbounds.forEach((n: any) => usageEntries.push({ object_type: n.type || 'Unknown', object_name: n.name || 'Unknown', direction: 'outbound' }));
      await upsertRegistry({
        de_name: de.name,
        de_key: de.id,
        pii_summary: payload.de.pii_summary,
        usage_summary: { inbound: inbounds, outbound: outbounds },
        risk_score,
        risk_level,
      });
      await saveUsageEntries(de.id, usageEntries);
      await saveTransformations(transformations.map((t: any) => ({ query_id: t.query, source_de_keys: [], target_de_key: undefined, mapping: t.mapping, sql_text: undefined, confidence: t.confidence })));
    }

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'mindmap_failed' }, { status: 500 });
  }
}

function extractAmpScriptDeNames(html: string): string[] {
  const names = new Set<string>();
  const rx = /\b(Lookup|LookupRows|InsertDE|UpdateDE|DeleteDE|UpsertDE)\s*\(\s*['"]([^'"]+)['"]/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    names.add(m[2]);
  }
  return Array.from(names);
}
