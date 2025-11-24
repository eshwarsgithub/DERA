'use client';

import React, { useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

const layout = {
    name: 'dagre',
    rankDir: 'LR',
    spacingFactor: 1.2,
};

const stylesheet: any[] = [
    {
        selector: 'node',
        style: {
            'background-color': '#666',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'width': 'label',
            'height': '40px',
            'padding': '10px',
            'shape': 'round-rectangle',
            'text-wrap': 'wrap',
        }
    },
    {
        selector: 'node[type="DataExtension"]',
        style: {
            'background-color': '#0070d2', // Salesforce Blue
        }
    },
    {
        selector: 'node[type="Query"]',
        style: {
            'background-color': '#e07a5f', // Orange
            'shape': 'diamond',
        }
    },
    {
        selector: 'node[type="Automation"]',
        style: {
            'background-color': '#3d405b', // Dark Blue
            'shape': 'hexagon',
        }
    },
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-background-color': '#fff',
            'text-background-opacity': 1,
        }
    },
    {
        selector: 'edge[confidence < 0.8]',
        style: {
            'line-style': 'dashed',
            'line-color': '#f8961e',
        }
    }
];

export default function LineageGraph() {
    const [elements, setElements] = useState<any>(null);

    useEffect(() => {
        fetch('/graph_snapshot.json')
            .then((res) => res.json())
            .then((data) => {
                // Transform to Cytoscape elements array
                // The JSON from python has { elements: { nodes: [], edges: [] } }
                // Cytoscape expects flat array or { nodes, edges }
                // Our Python script outputs { elements: { nodes: [...], edges: [...] } }
                // CytoscapeComponent elements prop expects array of elements

                const nodes = data.elements.nodes;
                const edges = data.elements.edges;
                setElements([...nodes, ...edges]);
            })
            .catch((err) => console.error('Failed to load graph data', err));
    }, []);

    if (!elements) return <div>Loading Graph...</div>;

    return (
        <div className="w-full h-[600px] border border-gray-200 rounded-lg shadow-sm bg-white">
            <CytoscapeComponent
                elements={elements}
                style={{ width: '100%', height: '100%' }}
                layout={layout}
                stylesheet={stylesheet}
                cy={(cy: any) => {
                    cy.on('tap', 'node', (evt: any) => {
                        const node = evt.target;
                        console.log('tapped ' + node.id());
                        alert(`Selected: ${node.data('label')} (${node.data('type')})`);
                    });
                }}
            />
        </div>
    );
}
