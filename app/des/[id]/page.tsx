import React from 'react';
import { getBaseUrl } from '@/src/lib/absoluteUrl';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import Link from 'next/link';

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
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Data Extension not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">{de.name}</h2>
          <p className="text-slate-400 mt-1 text-sm font-mono">{de.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-sm text-slate-400">Risk Score:</span>
            <span className={`font-bold ${(de.riskScore ?? 0) > 70 ? 'text-red-400' :
                (de.riskScore ?? 0) > 30 ? 'text-yellow-400' : 'text-green-400'
              }`}>
              {de.riskScore ?? 0}
            </span>
          </div>
          <Link href={`/mindmap?deKey=${encodeURIComponent(de.id ?? de.name)}`}>
            <Button variant="primary">View Mind Map</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Fields" description="Schema and PII classification">
          <div className="mt-4 space-y-2">
            {(data.fields ?? []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200">{f.name}</span>
                  <span className="text-xs text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800">{f.dataType}</span>
                </div>
                {f.isPII && (
                  <Badge variant="danger">{f.piiType ?? 'PII'}</Badge>
                )}
              </div>
            ))}
            {(data.fields ?? []).length === 0 && (
              <div className="text-slate-500 text-sm italic">No fields defined</div>
            )}
          </div>
        </Card>

        <Card title="Relationships" description="Connected Data Extensions">
          <div className="mt-4 space-y-2">
            {(data.relationships ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">{r.relationType}</span>
                  <span className="text-slate-600">→</span>
                  <Link href={`/des/${r.toDeId}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                    {r.toName ?? r.toDeId}
                  </Link>
                </div>
              </div>
            ))}
            {(data.relationships ?? []).length === 0 && (
              <div className="text-slate-500 text-sm italic">No relationships found</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}