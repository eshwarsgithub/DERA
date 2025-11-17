"use client";
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

type MindMap = {
  de: { key: string; name: string; risk_level?: string };
  inbound: Array<any>;
  outbound: Array<any>;
  transformations: Array<any>;
};

function MindMapInner() {
  const sp = useSearchParams();
  const deKey = sp.get('deKey') ?? '';
  const [data, setData] = useState<MindMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const res = await fetch(`/api/de/mindmap?deKey=${encodeURIComponent(deKey)}`);
        if (!res.ok) throw new Error(await res.text());
        const j = (await res.json()) as MindMap;
        if (!cancelled) setData(j);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      }
    }
    if (deKey) load();
    return () => {
      cancelled = true;
    };
  }, [deKey]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const nodes: any[] = [];
    const edges: any[] = [];
    nodes.push({ id: data.de.key, data: { label: `${data.de.name}` }, position: { x: 0, y: 0 }, type: 'default' });

  const y = 100;
    data.inbound.forEach((n, i) => {
      const id = `in-${i}`;
      nodes.push({ id, data: { label: `${n.type}: ${n.name}` }, position: { x: -300, y: y + i * 80 } });
      edges.push({ id: `e-${id}`, source: id, target: data.de.key, label: n.confidence ?? '' });
    });
    data.outbound.forEach((n, i) => {
      const id = `out-${i}`;
      nodes.push({ id, data: { label: `${n.type}: ${n.name}` }, position: { x: 300, y: y + i * 80 } });
      edges.push({ id: `e-${id}`, source: data.de.key, target: id, label: n.confidence ?? '' });
    });

    data.transformations.forEach((t, i) => {
      const id = `tx-${i}`;
      nodes.push({ id, data: { label: `Query: ${t.query ?? t.name ?? 'Transform'}` }, position: { x: 0, y: 200 + i * 100 } });
      edges.push({ id: `e-tx-${i}`, source: id, target: data.de.key });
    });

    return { nodes, edges };
  }, [data]);

  return (
    <div className="h-[calc(100vh-80px)]">
      <div className="p-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Mind Map {deKey ? `for ${deKey}` : ''}</div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          {data?.de?.risk_level ? `Risk: ${data.de.risk_level}` : ''}
          {deKey && (
            <>
              <a className="px-2 py-1 rounded bg-white/10 border border-white/20" href={`/api/de/mindmap/export?deKey=${encodeURIComponent(deKey)}&format=json`} target="_blank">Export JSON</a>
              <a className="px-2 py-1 rounded bg-white/10 border border-white/20" href={`/api/de/mindmap/export?deKey=${encodeURIComponent(deKey)}&format=pdf`} target="_blank">Export PDF</a>
              <a className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500" href={`/api/de/mindmap?deKey=${encodeURIComponent(deKey)}&persist=1`} target="_blank">Save</a>
            </>
          )}
        </div>
      </div>
      {error && <div className="p-3 text-red-400 text-sm">{error}</div>}
      <div className="h-full">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MindMapPage() {
  return (
    <Suspense fallback={<div className="p-3 text-sm text-white/70">Loading mind map…</div>}>
      <MindMapInner />
    </Suspense>
  );
}
