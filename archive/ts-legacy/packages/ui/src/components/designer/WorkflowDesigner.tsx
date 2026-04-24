"use client";

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Save, Plus, Play, Trash2, Settings2, Layout } from 'lucide-react';

const initialNodes: Node[] = [
  { 
    id: 'start', 
    data: { label: 'Start Trigger' }, 
    position: { x: 250, y: 0 },
    type: 'input',
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
  }
];

type WorkflowSummary = {
  id: string;
  name: string;
};

type WorkflowListResponse = {
  workflows: WorkflowSummary[];
};

type WorkflowRecord = {
  id: string;
  name: string;
  uiConfig?: {
    nodes?: Node[];
    edges?: Edge[];
  } | null;
};

type WorkflowDetailResponse = {
  success: true;
  workflow: WorkflowRecord;
} | {
  success?: false;
  error?: string;
};

type WorkflowSaveResponse = {
  success: true;
  workflow: { id: string };
} | {
  success?: false;
  error?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFlowPosition(value: unknown): value is Node['position'] {
  return isObject(value)
    && typeof value.x === 'number'
    && Number.isFinite(value.x)
    && typeof value.y === 'number'
    && Number.isFinite(value.y);
}

function isFlowNode(value: unknown): value is Node {
  return isObject(value)
    && typeof value.id === 'string'
    && isFlowPosition(value.position)
    && isObject(value.data);
}

function isFlowEdge(value: unknown): value is Edge {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.source === 'string'
    && typeof value.target === 'string';
}

function isWorkflowSummary(value: unknown): value is WorkflowSummary {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string';
}

function isWorkflowListResponse(value: unknown): value is WorkflowListResponse {
  return isObject(value)
    && Array.isArray(value.workflows)
    && value.workflows.every(isWorkflowSummary);
}

function isWorkflowRecord(value: unknown): value is WorkflowRecord {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }

  if (value.uiConfig == null) {
    return true;
  }

  if (!isObject(value.uiConfig)) {
    return false;
  }

  const { nodes, edges } = value.uiConfig;
  return (nodes === undefined || (Array.isArray(nodes) && nodes.every(isFlowNode)))
    && (edges === undefined || (Array.isArray(edges) && edges.every(isFlowEdge)));
}

function isWorkflowDetailResponse(value: unknown): value is WorkflowDetailResponse {
  if (!isObject(value)) {
    return false;
  }

  if (value.success === true) {
    return isWorkflowRecord(value.workflow);
  }

  return value.success === false || value.success === undefined;
}

function isWorkflowSaveResponse(value: unknown): value is WorkflowSaveResponse {
  if (!isObject(value)) {
    return false;
  }

  if (value.success === true) {
    return isObject(value.workflow) && typeof value.workflow.id === 'string';
  }

  return value.success === false || value.success === undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function WorkflowDesigner() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [name, setName] = useState('New Workflow');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setFetchError(null);
    try {
      const res = await fetch('/api/workflows');
      if (!res.ok) {
        throw new Error(`Workflow list request failed with ${res.status}.`);
      }
      const data: unknown = await res.json();
      if (!isWorkflowListResponse(data)) {
        throw new Error('Workflow list response was malformed.');
      }
      setWorkflows(data.workflows);
    } catch (err) {
      setFetchError(getErrorMessage(err));
      setWorkflows([]);
    }
  };

  const loadWorkflow = async (id: string) => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) {
        throw new Error(`Workflow load request failed with ${res.status}.`);
      }
      const data: unknown = await res.json();
      if (!isWorkflowDetailResponse(data)) {
        throw new Error('Workflow detail response was malformed.');
      }
      if (data.success !== true) {
        throw new Error(data.error ?? 'Workflow load failed.');
      }

      setSelectedWorkflowId(id);
      setName(data.workflow.name);
      if (data.workflow.uiConfig) {
        setNodes(data.workflow.uiConfig.nodes ?? initialNodes);
        setEdges(data.workflow.uiConfig.edges ?? []);
      } else {
        setNodes(initialNodes);
        setEdges([]);
      }
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  };

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleSave = async () => {
    setSaveError(null);
    const payload = {
      name,
      uiConfig: { nodes, edges },
      status: 'active'
    };

    try {
      let res;
      if (selectedWorkflowId) {
        res = await fetch(`/api/workflows/${selectedWorkflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        throw new Error(`Workflow save request failed with ${res.status}.`);
      }

      const data: unknown = await res.json();
      if (!isWorkflowSaveResponse(data)) {
        throw new Error('Workflow save response was malformed.');
      }
      if (data.success === true) {
        alert('Workflow saved successfully!');
        if (!selectedWorkflowId) setSelectedWorkflowId(data.workflow.id);
        fetchWorkflows();
        return;
      }
      throw new Error(data.error ?? 'Workflow save failed.');
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  const addNode = (type: string) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      data: { label: `${type.toUpperCase()}: New Node` },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: { 
        background: type === 'agent' ? '#4c1d95' : type === 'tool' ? '#064e3b' : '#1e293b', 
        color: '#fff', 
        border: '1px solid #334155' 
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex flex-col h-[700px] w-full">
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 rounded-t-lg">
        <div className="flex items-center gap-4">
          <Select onValueChange={loadWorkflow} value={selectedWorkflowId || undefined}>
            <SelectTrigger className="w-[200px] bg-slate-950 border-slate-800">
              <SelectValue placeholder="Select Workflow" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-50">
              {workflows.map(wf => (
                <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-[200px] bg-slate-950 border-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => addNode('agent')} className="border-slate-700 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Agent
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode('tool')} className="border-slate-700 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Tool
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode('council')} className="border-slate-700 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Council
          </Button>
          <div className="w-px h-4 bg-slate-800 mx-2" />
          <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 h-8 text-xs">
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="secondary" className="h-8 text-xs">
            <Play className="h-3 w-3 mr-1" /> Execute
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 relative">
        <div className="absolute left-4 right-4 top-4 z-20 space-y-2">
          {fetchError ? (
            <Alert variant="destructive">
              <AlertTitle>Workflows unavailable</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          ) : null}
          {loadError ? (
            <Alert variant="destructive">
              <AlertTitle>Workflow load failed</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}
          {saveError ? (
            <Alert variant="destructive">
              <AlertTitle>Workflow save failed</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#1e293b" gap={20} />
          <Controls className="bg-slate-900 border-slate-800 fill-slate-400" />
          <MiniMap className="bg-slate-900 border-slate-800" nodeColor="#334155" />
        </ReactFlow>
        
        {/* Help Overlay */}
        <div className="absolute bottom-4 right-4 p-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded text-[10px] text-slate-500 pointer-events-none">
          <p>Drag to move • Connect ports to link • Delete key to remove</p>
        </div>
      </div>
    </div>
  );
}
