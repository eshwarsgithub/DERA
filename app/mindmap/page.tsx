"use client";
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, { Background, Controls, MiniMap, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';

type MindMap = {
  de: { key: string; name: string; risk_level?: string; pii_summary?: Record<string, boolean> };
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

    // Central Node (DE)
    nodes.push({
      id: data.de.key,
      data: { label: `${data.de.name}` },
      position: { x: 0, y: 0 },
      type: 'input', // Using input type for distinct look, or default
      style: {
        background: '#3B82F6',
        color: 'white',
        border: 'none',
        width: 180,
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
      }
    });

    const y = 100;

    // Inbound Nodes
    data.inbound.forEach((n, i) => {
      const id = `in-${i}`;
      nodes.push({
        id,
        data: { label: `${n.type}: ${n.name}` },
        position: { x: -350, y: y + i * 100 },
        style: { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', width: 160 }
      });
      edges.push({
        id: `e-${id}`,
        source: id,
        target: data.de.key,
        label: n.confidence ?? '',
        animated: true,
        style: { stroke: '#64748B' }
      });
    });

    // Outbound Nodes
    data.outbound.forEach((n, i) => {
      const id = `out-${i}`;
      nodes.push({
        id,
        data: { label: `${n.type}: ${n.name}` },
        position: { x: 350, y: y + i * 100 },
        style: { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', width: 160 }
      });
      edges.push({
        id: `e-${id}`,
        source: data.de.key,
        target: id,
        label: n.confidence ?? '',
        animated: true,
        style: { stroke: '#64748B' }
      });
    });

    // Transformation Nodes
    data.transformations.forEach((t, i) => {
      const id = `tx-${i}`;
      nodes.push({
        id,
        data: { label: `Query: ${t.query ?? t.name ?? 'Transform'}` },
        position: { x: 0, y: 250 + i * 120 },
        style: { background: '#0F172A', color: '#CBD5E1', border: '1px dashed #475569', width: 200 }
      });
      edges.push({
        id: `e-tx-${i}`,
        source: id,
        target: data.de.key,
        style: { stroke: '#475569', strokeDasharray: '5,5' }
      });
    });

    return { nodes, edges };
  }, [data]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
      <Card className="!p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Mind Map
            {deKey && <span className="text-blue-400 font-normal text-lg">/ {deKey}</span>}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {data?.de?.risk_level && (
            <Badge variant={data.de.risk_level === 'High' ? 'danger' : 'warning'}>
              Risk: {data.de.risk_level}
            </Badge>
          )}
          {data?.de?.pii_summary && (
            <Badge variant="info">
              PII: {Object.entries(data.de.pii_summary).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'}
            </Badge>
          )}

          {deKey && (
            <div className="flex items-center gap-2 ml-4 border-l border-white/10 pl-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(`/api/de/mindmap/export?deKey=${encodeURIComponent(deKey)}&format=json`, '_blank')}
              >
                Export JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(`/api/de/mindmap/export?deKey=${encodeURIComponent(deKey)}&format=pdf`, '_blank')}
              >
                Export PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(`/api/de/mindmap?deKey=${encodeURIComponent(deKey)}&persist=1`, '_blank')}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">
          Error loading mind map: {error}
        </div>
      )}

      <div className="flex-1 rounded-xl overflow-hidden border border-white/5 shadow-2xl shadow-black/50 bg-[#0B1120]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          className="bg-[#0B1120]"
        >
          <MiniMap
            style={{ background: '#1E293B', border: '1px solid #334155' }}
            nodeColor={(n) => {
              if (n.id === data?.de?.key) return '#3B82F6';
              return '#475569';
            }}
            maskColor="rgba(15, 23, 42, 0.6)"
          />
          <Controls className="bg-slate-800 border-slate-700 fill-white" />
          <Background color="#334155" gap={20} size={1} />
          <Panel position="top-left" className="bg-slate-900/80 p-2 rounded border border-white/10 text-xs text-slate-400">
            <div>Blue: Target DE</div>
            <div>Solid: Direct Flow</div>
            <div>Dashed: Transformation</div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MindMapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 animate-pulse">Loading visualization...</div>}>
      <MindMapInner />
    </Suspense>
  );
}
