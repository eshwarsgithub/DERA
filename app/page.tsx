import React from 'react';
import { getBaseUrl } from '@/src/lib/absoluteUrl';

async function getStats() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/registry/stats`, {
    cache: 'no-store',
  });
  try {
    return await res.json();
  } catch {
    return { totalDes: 0, piiFields: 0, orphanCount: 0, avgRisk: 0 };
  }
}

export default async function Page() {
  const stats = await getStats();

  const cards = [
    { label: 'Total DEs', value: stats.totalDes ?? 0 },
    { label: 'PII Fields', value: stats.piiFields ?? 0 },
    { label: 'Orphan DEs', value: stats.orphanCount ?? 0 },
    { label: 'Avg Risk', value: (stats.avgRisk ?? 0).toFixed(0) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Summary Dashboard</h2>
        <form action="/api/scan/start" method="post">
          <button className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500">Run Scan</button>
        </form>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded border border-white/10 p-4 bg-white/5">
            <div className="text-sm text-white/70">{c.label}</div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}