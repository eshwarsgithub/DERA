import React from 'react';
import { getBaseUrl } from '@/src/lib/absoluteUrl';

async function getDes(params: URLSearchParams) {
  const qs = params.toString();
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/registry/des?${qs}`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function Page({ searchParams }: { searchParams: Record<string, string> }) {
  const params = new URLSearchParams(searchParams as any);
  const q = params.get('q') || '';
  const sortBy = params.get('sortBy') || 'de_name';
  const sortDir = params.get('sortDir') || 'asc';
  const data = await (async () => {
    try {
      const base = getBaseUrl();
      const qs = new URLSearchParams({ q, sortBy, sortDir });
      const res = await fetch(`${base}/api/de/inventory?${qs.toString()}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {}
    return await getDes(params); // fallback to legacy endpoint if needed
  })();
  const items = data.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Data Extensions</h2>
        <form className="flex items-center gap-2" method="get">
          <input name="q" defaultValue={q} placeholder="Search..." className="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm" />
          <select name="sortBy" defaultValue={sortBy} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm">
            <option value="de_name">Name</option>
            <option value="risk_score">Risk</option>
          </select>
          <select name="sortDir" defaultValue={sortDir} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm">
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm">Apply</button>
        </form>
      </div>
      <div className="rounded border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Orphan</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="p-2"><a className="hover:underline" href={`/des/${it.id ?? it.de_key}`}>{it.name ?? it.de_name}</a></td>
                <td className="p-2">{it.riskScore ?? it.risk_score}</td>
                <td className="p-2">{(it.isOrphan ?? false) ? 'Yes' : 'No'}</td>
                <td className="p-2 text-sm"><a className="text-blue-400 hover:underline" href={`/mindmap?deKey=${encodeURIComponent(it.id ?? it.de_key ?? it.name ?? it.de_name)}`}>Analyze</a></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="p-3 text-white/60" colSpan={4}>No Data Extensions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}