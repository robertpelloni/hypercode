'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  MiniMap,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Custom Nodes ---
function AgentNode({ data }: { data: any }) {
  return (
    <div className="bg-gray-800 border-2 border-emerald-500 rounded p-3 w-40 text-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3" />
      <div className="font-bold text-gray-200 text-sm">{data.label as string}</div>
      <div className="text-emerald-400 text-xs mt-1 font-mono">SmartPilot</div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3" />
    </div>
  );
}

function ToolNode({ data }: { data: any }) {
  return (
    <div className="bg-gray-800 border-2 border-orange-500 rounded p-3 w-40 text-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" />
      <div className="font-bold text-gray-200 text-sm">{data.label as string}</div>
      <div className="text-orange-400 text-xs mt-1 font-mono">MCP Tool</div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
};

// --- Sidebar Component ---
function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-700 p-4 flex flex-col gap-4">
      <h3 className="text-gray-300 font-semibold text-sm">Orchestration Nodes</h3>
      <p className="text-xs text-gray-500 leading-snug">Drag and drop nodes onto the canvas to construct an autonomous pipeline.</p>
      
      <div 
        className="bg-gray-800 border-2 border-emerald-500/50 hover:border-emerald-500 rounded p-2 text-center text-sm cursor-grab text-gray-200 transition-colors"
        onDragStart={(event) => onDragStart(event, 'agent', 'New SmartPilot')} 
        draggable
      >
        Agent / Council
      </div>
      
      <div 
        className="bg-gray-800 border-2 border-orange-500/50 hover:border-orange-500 rounded p-2 text-center text-sm cursor-grab text-gray-200 transition-colors"
        onDragStart={(event) => onDragStart(event, 'tool', 'New Action')} 
        draggable
      >
        MCP Tool Call
      </div>
    </aside>
  );
}

// --- Canvas Inner ---
import { trpc } from '@/utils/trpc';

const initialNodes: Node[] = [
  { id: '1', type: 'agent', position: { x: 50, y: 50 }, data: { label: 'Director Agent' } },
  { id: '2', type: 'tool', position: { x: 50, y: 200 }, data: { label: 'Filesystem (FS)' } },
  { id: '3', type: 'agent', position: { x: 250, y: 350 }, data: { label: 'Verifier Agent' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true }
];

type SavedWorkflowCanvas = {
  id: string;
  name: string;
  nodes_json: Node[];
  edges_json: Edge[];
};

function isFlowPosition(value: unknown): value is { x: number; y: number } {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { x?: unknown }).x === 'number'
    && typeof (value as { y?: unknown }).y === 'number';
}

function isFlowNode(value: unknown): value is Node {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { id?: unknown }).id === 'string'
    && isFlowPosition((value as { position?: unknown }).position)
    && (
      (value as { type?: unknown }).type === undefined
      || typeof (value as { type?: unknown }).type === 'string'
    )
    && typeof (value as { data?: unknown }).data === 'object'
    && (value as { data?: unknown }).data !== null;
}

function isFlowEdge(value: unknown): value is Edge {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { id?: unknown }).id === 'string'
    && typeof (value as { source?: unknown }).source === 'string'
    && typeof (value as { target?: unknown }).target === 'string'
    && (
      (value as { sourceHandle?: unknown }).sourceHandle === undefined
      || typeof (value as { sourceHandle?: unknown }).sourceHandle === 'string'
      || (value as { sourceHandle?: unknown }).sourceHandle === null
    )
    && (
      (value as { targetHandle?: unknown }).targetHandle === undefined
      || typeof (value as { targetHandle?: unknown }).targetHandle === 'string'
      || (value as { targetHandle?: unknown }).targetHandle === null
    );
}

function isSavedWorkflowCanvas(value: unknown): value is SavedWorkflowCanvas {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { id?: unknown }).id === 'string'
    && typeof (value as { name?: unknown }).name === 'string'
    && Array.isArray((value as { nodes_json?: unknown }).nodes_json)
    && Array.isArray((value as { edges_json?: unknown }).edges_json)
    && (value as { nodes_json: unknown[] }).nodes_json.every(isFlowNode)
    && (value as { edges_json: unknown[] }).edges_json.every(isFlowEdge);
}

function CanvasInner() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>('My Autonomous Pipeline');
  const [saveError, setSaveError] = useState<string | null>(null);

  const { screenToFlowPosition } = useReactFlow();
  const utils = trpc.useUtils();

  const { data: savedFlows, error: savedFlowsError } = trpc.workflow.listCanvases.useQuery();
  const savedFlowsUnavailable = Boolean(savedFlowsError) || (savedFlows !== undefined && !Array.isArray(savedFlows));
  const savedFlowList = !savedFlowsUnavailable && Array.isArray(savedFlows)
    ? savedFlows.filter(isSavedWorkflowCanvas)
    : [];
  const savedFlowsShapeError = !savedFlowsUnavailable && Array.isArray(savedFlows) && savedFlows.length !== savedFlowList.length;
  
  const saveMutation = trpc.workflow.saveCanvas.useMutation({
    onSuccess: (data) => {
      setSaveError(null);
      setCurrentId(data.id);
      utils.workflow.listCanvases.invalidate();
    },
    onError: (error) => {
      setSaveError(error.message);
    }
  });

  const handleSave = () => {
    setSaveError(null);
    saveMutation.mutate({ id: currentId, name, nodes, edges });
  };

  const handleLoad = (flowId: string) => {
    if (!flowId) return;
    const flow = savedFlowList.find((f) => f.id === flowId);
    if (!flow) return;
    
    setCurrentId(flow.id);
    setName(flow.name);
    setNodes(flow.nodes_json);
    setEdges(flow.edges_json);
  };

  const handleClear = () => {
    setSaveError(null);
    setCurrentId(undefined);
    setName('New Pipeline ' + Date.now());
    setNodes([]);
    setEdges([]);
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    <div className="flex-1 h-full w-full relative bg-gray-950">
      {savedFlowsUnavailable || savedFlowsShapeError ? (
        <div className="absolute left-4 top-4 z-20 max-w-md rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 shadow-xl backdrop-blur-md">
          Workflow canvases unavailable: {savedFlowsError?.message ?? 'Workflow canvases returned an invalid payload.'}
        </div>
      ) : null}
      {saveError ? (
        <div className="absolute left-4 top-20 z-20 max-w-md rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 shadow-xl backdrop-blur-md">
          Workflow save failed: {saveError}
        </div>
      ) : null}
      
      {/* ── Top Bar Overlay ── */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 items-center bg-gray-900/80 p-2 rounded-md border border-gray-700 shadow-xl backdrop-blur-md">
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-gray-800 text-sm text-emerald-400 font-semibold px-2 py-1 rounded border border-gray-700 w-48"
          />
          <select onChange={(e) => handleLoad(e.target.value)} value={currentId || ''} disabled={savedFlowsUnavailable || savedFlowsShapeError} className="bg-gray-800 text-sm text-gray-200 px-2 py-1 rounded border border-gray-700 w-40 disabled:opacity-60">
            <option value="">-- Load Pipeline --</option>
            {savedFlowList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
         <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors" disabled={saveMutation.isPending}>
           {saveMutation.isPending ? 'Saving...' : '💾 Save'}
         </button>
         <button onClick={handleClear} className="bg-gray-700 hover:bg-red-900 text-gray-300 px-3 py-1 rounded text-sm transition-colors">
           Clear Canvas
         </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={() => console.log('flow loaded')}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        colorMode="dark"
      >
        <Background color="#333" gap={16} />
        <Controls className="bg-gray-800 border-gray-700 fill-gray-300" />
        <MiniMap nodeColor="#4B5563" maskColor="#11182788" className="bg-gray-900 border-gray-800" />
      </ReactFlow>
    </div>
  );
}

// --- Main Export Wrapper ---
export function WorkflowCanvas() {
  return (
    <div className="react-flow-wrapper flex flex-row w-full h-full rounded-md overflow-hidden">
      <ReactFlowProvider>
        <Sidebar />
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
