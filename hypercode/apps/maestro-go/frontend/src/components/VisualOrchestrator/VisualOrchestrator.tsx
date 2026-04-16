import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	addEdge,
	Connection,
	Edge,
	Node,
	Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '../../../web/components/ThemeProvider';
import { Play, Square, Settings2 } from 'lucide-react';

const initialNodes: Node[] = [
	{
		id: '1',
		type: 'input',
		data: { label: 'Start Playbook' },
		position: { x: 250, y: 25 },
		style: {
			background: '#1a1a1a',
			color: '#ffffff',
			border: '1px solid #333333',
			borderRadius: '8px',
		},
	},
	{
		id: '2',
		data: {
			label: (
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2 font-bold text-sm">
						<Settings2 size={14} /> Refactor Components
					</div>
					<div className="text-xs opacity-70">Agent: Claude Code</div>
					<div className="flex gap-1 mt-2">
						<button className="p-1 bg-green-900/30 text-green-400 rounded hover:bg-green-900/50">
							<Play size={12} />
						</button>
						<button className="p-1 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50">
							<Square size={12} />
						</button>
					</div>
				</div>
			),
		},
		position: { x: 250, y: 125 },
		style: {
			background: '#1e1e1e',
			color: '#d4d4d4',
			border: '1px solid #404040',
			borderRadius: '8px',
			minWidth: '200px',
		},
	},
	{
		id: '3',
		type: 'output',
		data: { label: 'QA / Testing' },
		position: { x: 250, y: 250 },
		style: {
			background: '#1e1e1e',
			color: '#d4d4d4',
			border: '1px solid #404040',
			borderRadius: '8px',
			minWidth: '200px',
		},
	},
];

const initialEdges: Edge[] = [
	{ id: 'e1-2', source: '1', target: '2', animated: true },
	{ id: 'e2-3', source: '2', target: '3' },
];

export function VisualOrchestrator() {
	const { theme } = useTheme();
	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const onConnect = useCallback(
		(params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges]
	);

	// Theme-aware styles
	const flowStyles = useMemo(
		() => ({
			backgroundColor: theme.colors.bgMain,
			color: theme.colors.textMain,
		}),
		[theme]
	);

	return (
		<div className="w-full h-full flex flex-col" style={flowStyles}>
			<div
				className="flex items-center justify-between p-4 border-b"
				style={{ borderColor: theme.colors.border }}
			>
				<h2 className="text-lg font-bold" style={{ color: theme.colors.accent }}>
					Visual Command Orchestrator (Prototype)
				</h2>
				<div className="flex gap-2">
					<button
						className="px-3 py-1.5 rounded text-xs font-semibold"
						style={{ backgroundColor: theme.colors.accent, color: theme.colors.bgMain }}
					>
						Run All
					</button>
				</div>
			</div>

			<div className="flex-1 relative">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					fitView
					attributionPosition="bottom-right"
				>
					<Background color={theme.colors.border} gap={16} />
					<Controls
						style={{
							backgroundColor: theme.colors.bgActivity,
							borderColor: theme.colors.border,
							color: theme.colors.textMain,
						}}
					/>
					<MiniMap
						nodeColor={theme.colors.accent}
						maskColor={`${theme.colors.bgMain}80`}
						style={{
							backgroundColor: theme.colors.bgActivity,
						}}
					/>
					<Panel
						position="top-left"
						className="p-2 rounded shadow text-xs"
						style={{
							backgroundColor: theme.colors.bgActivity,
							border: `1px solid ${theme.colors.border}`,
						}}
					>
						Drag nodes to reorder execution pipeline
					</Panel>
				</ReactFlow>
			</div>
		</div>
	);
}

export default VisualOrchestrator;
