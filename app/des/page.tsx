import React from 'react';
import { getBaseUrl } from '@/src/lib/absoluteUrl';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import Link from 'next/link';

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
    } catch { }
    return await getDes(params); // fallback to legacy endpoint if needed
  })();
  const items = data.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Data Extensions</h2>
          <p className="text-slate-400 mt-1">Manage and analyze your data extensions.</p>
        </div>
        <form className="flex flex-col md:flex-row items-end gap-3 bg-slate-900/50 p-4 rounded-xl border border-white/5" method="get">
          <div className="w-full md:w-64">
            <Input name="q" defaultValue={q} placeholder="Search by name..." />
          </div>
          <div className="w-full md:w-32">
            <Select
              name="sortBy"
              defaultValue={sortBy}
              options={[
                { label: 'Name', value: 'de_name' },
                { label: 'Risk', value: 'risk_score' }
              ]}
            />
          </div>
          <div className="w-full md:w-24">
            <Select
              name="sortDir"
              defaultValue={sortDir}
              options={[
                { label: 'Asc', value: 'asc' },
                { label: 'Desc', value: 'desc' }
              ]}
            />
          </div>
          <Button type="submit" variant="primary">Apply</Button>
        </form>
      </div>

      <Card className="overflow-hidden !p-0 border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Risk Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((it: any) => (
                <tr key={it.id ?? it.de_key ?? it.name ?? it.de_name} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">
                    <Link className="hover:text-blue-400 transition-colors" href={`/des/${it.id ?? it.de_key}`}>
                      {it.name ?? it.de_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(it.riskScore ?? it.risk_score) > 70 ? 'bg-red-500' :
                              (it.riskScore ?? it.risk_score) > 30 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${it.riskScore ?? it.risk_score}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-400">{it.riskScore ?? it.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(it.isOrphan ?? false) ? (
                      <Badge variant="warning">Orphan</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/mindmap?deKey=${encodeURIComponent(it.id ?? it.de_key ?? it.name ?? it.de_name)}`}>
                      <Button variant="ghost" size="sm">Analyze</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={4}>
                    No Data Extensions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}