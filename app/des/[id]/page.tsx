import React from 'react';
import { getBaseUrl } from '@/src/lib/absoluteUrl';

async function getDe(id: string) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/registry/des/${id}`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function Page({ params }: { params: { id: string } }) {
  const data = await getDe(params.id);
  const de = data.de;
  if (!de) {
    return <div className="text-white/70">Not found</div>;
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{de.name}</h2>
        <div className="flex items-center gap-3 text-sm">
          <div>Risk: <span className="font-semibold">{de.riskScore}</span></div>
          <a className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500" href={`/mindmap?deKey=${encodeURIComponent(de.id ?? de.name)}`}>View Mind Map</a>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-white/10 p-3">
          <div className="font-semibold mb-2">Fields</div>
          <ul className="space-y-1 text-sm">
            {(data.fields ?? []).map((f: any) => (
              <li key={f.id} className="flex justify-between">
                <span>{f.name} <span className="text-white/60">({f.dataType})</span></span>
                {f.isPII && <span className="text-red-400">{f.piiType ?? 'PII'}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-white/10 p-3">
          <div className="font-semibold mb-2">Relationships</div>
          <ul className="space-y-1 text-sm">
            {(data.relationships ?? []).map((r: any) => (
              <li key={r.id}>
                {r.relationType} → <a className="hover:underline" href={`/des/${r.toDeId}`}>{r.toName ?? r.toDeId}</a>
              </li>
            ))}
            {(data.relationships ?? []).length === 0 && <li className="text-white/60">None</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}