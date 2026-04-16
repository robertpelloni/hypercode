import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../web/components/ThemeProvider';
import { useLayerStack } from '../../contexts/LayerStackContext';
import { X } from 'lucide-react';
import VisualOrchestrator from './VisualOrchestrator';

interface VisualOrchestratorModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function VisualOrchestratorModal({ isOpen, onClose }: VisualOrchestratorModalProps) {
	const { theme } = useTheme();
	const { registerLayer, unregisterLayer, updateLayerHandler } = useLayerStack();
	const layerIdRef = useRef<string | null>(null);

	// Register with LayerStackContext for escape key handling
	useEffect(() => {
		if (isOpen) {
			layerIdRef.current = registerLayer({
				type: 'modal',
				priority: 50,
				onEscape: onClose,
			});
		} else if (layerIdRef.current) {
			unregisterLayer(layerIdRef.current);
			layerIdRef.current = null;
		}

		return () => {
			if (layerIdRef.current) {
				unregisterLayer(layerIdRef.current);
			}
		};
	}, [isOpen, registerLayer, unregisterLayer, onClose]);

	// Update the escape handler if onClose changes
	useEffect(() => {
		if (isOpen && layerIdRef.current) {
			updateLayerHandler(layerIdRef.current, onClose);
		}
	}, [isOpen, onClose, updateLayerHandler]);

	if (!isOpen) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
			{/* Backdrop */}
			<div
				className="absolute inset-0 transition-opacity duration-300 pointer-events-auto"
				style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal Content */}
			<div
				className="relative flex flex-col w-[95vw] h-[95vh] rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
				style={{
					backgroundColor: theme.colors.bgMain,
					border: `1px solid ${theme.colors.border}`,
				}}
				role="dialog"
				aria-modal="true"
				aria-labelledby="orchestrator-title"
			>
				{/* Close Button overlay (absolute positioned so Orchestrator can use full space) */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors hover:opacity-80"
					style={{
						backgroundColor: theme.colors.bgActivity,
						color: theme.colors.textMain,
						border: `1px solid ${theme.colors.border}`,
					}}
					aria-label="Close Orchestrator"
				>
					<X size={18} />
				</button>

				{/* Main Graph Content */}
				<div className="flex-1 w-full h-full relative">
					<VisualOrchestrator />
				</div>
			</div>
		</div>,
		document.body
	);
}

export default VisualOrchestratorModal;
