'use client';

import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { Card } from '@hypercode/ui';
import { PageStatusBanner } from '@/components/PageStatusBanner';

export default function WorkflowsDashboard() {
    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <PageStatusBanner status="beta" message="Workflow Builder" note="Drag-and-drop SmartPilots, tools, and triggers to build autonomous pipelines." />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-emerald-400">Node-Graph Pipelines</h1>
                    <p className="text-muted-foreground">Visually assemble multi-agent cognitive mesh networks</p>
                </div>
            </div>

            <Card className="flex-1 min-h-0 bg-gray-800 border-gray-700 flex flex-col p-0 overflow-hidden" style={{ minHeight: '600px' }}>
                 <WorkflowCanvas />
            </Card>
        </div>
    );
}
