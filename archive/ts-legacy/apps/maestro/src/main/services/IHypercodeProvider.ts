import { HypercodeHandoff, HypercodeSettingsPayload, HypercodePlaybooksPayload } from '../../shared/hypercode-schema';

export interface IHypercodeProvider {
	createSession(task: string, initialMetadata?: Record<string, any>): Promise<string>;
	commitHandoff(handoff: HypercodeHandoff): Promise<void>;
	getHandoff(sessionId: string): Promise<HypercodeHandoff>;
	transitionPhase(sessionId: string, completedPhaseId: number, nextPhaseId?: number): Promise<void>;
	listSessions(): Promise<Array<{ sessionId: string; task: string; status: string }>>;
	archiveSession(sessionId: string): Promise<void>;
	getStatus(): Promise<{ connected: boolean; latencyMs?: number }>;
	syncSettings(settings: HypercodeSettingsPayload): Promise<HypercodeSettingsPayload>;
	syncPlaybooks(playbooks: HypercodePlaybooksPayload): Promise<HypercodePlaybooksPayload>;
}
