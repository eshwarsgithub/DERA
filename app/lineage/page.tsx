import React from 'react';
import LineageGraph from '../../src/components/LineageGraph';

export default function LineagePage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">SFMC Data Extension Lineage</h1>
            <p className="mb-6 text-gray-600">
                Interactive map of Data Extensions, Queries, and Automations.
            </p>
            <LineageGraph />
        </div>
    );
}
