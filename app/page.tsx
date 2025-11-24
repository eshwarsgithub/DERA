import React from 'react';
import { getBaseUrl } from '@/src/lib/absoluteUrl';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';

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
    { label: 'Total DEs', value: stats.totalDes ?? 0, desc: 'Total Data Extensions tracked' },
    { label: 'PII Fields', value: stats.piiFields ?? 0, desc: 'Fields identified as PII' },
    { label: 'Orphan DEs', value: stats.orphanCount ?? 0, desc: 'DEs with no dependencies' },
    { label: 'Avg Risk', value: (stats.avgRisk ?? 0).toFixed(0), desc: 'Average risk score (0-100)' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Summary Dashboard
          </h2>
          <p className="text-slate-400 mt-2">Overview of your Marketing Cloud data landscape.</p>
        </div>
        <form action="/api/scan/start" method="post">
          <Button variant="primary" size="lg">
            Run Scan
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <Card key={c.label} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-blue-500 blur-xl"></div>
            </div>
            <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">{c.label}</div>
            <div className="text-4xl font-bold mt-2 text-white group-hover:text-blue-400 transition-colors">
              {c.value}
            </div>
            <div className="text-xs text-slate-500 mt-2">{c.desc}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Activity" description="Latest scans and updates">
          <div className="text-sm text-slate-400 py-8 text-center">
            No recent activity to show.
          </div>
        </Card>
        <Card title="System Health" description="Status of connected services">
          <div className="text-sm text-slate-400 py-8 text-center">
            All systems operational.
          </div>
        </Card>
      </div>
    </div>
  );
}