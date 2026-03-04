/**
 * swarmRouter.ts
 * 
 * Exposes the Multi-Agent Orchestration features (Swarm, Debate, Consensus) to the Next.js UI.
 */

import { z } from 'zod';
import { t, publicProcedure } from '../trpc.js';
import { SwarmOrchestrator } from '../agents/swarm/SwarmOrchestrator.js';
import { DebateProtocol } from '../agents/swarm/DebateProtocol.js';
import { ConsensusEngine } from '../agents/swarm/ConsensusEngine.js';
import { MissionService } from '../services/MissionService.js';

// Global registry of active swarm orchestrators for approvals
const activeOrchestrators = new Map<string, SwarmOrchestrator>();

export const swarmRouter = t.router({

    startSwarm: publicProcedure
        .input(
            z.object({
                masterPrompt: z.string(),
                maxConcurrency: z.number().optional(),
                model: z.string().optional(),
                priority: z.number().min(1).max(5).optional(),
                tools: z.array(z.string()).optional()
            })
        )
        .mutation(async ({ input }: { input: { masterPrompt: string; maxConcurrency?: number; model?: string; priority?: number; tools?: string[] } }) => {
            const missionService = global.mcpServerInstance?.missionService;
            const healerService = global.mcpServerInstance?.healerService;

            const orchestrator = new SwarmOrchestrator(
                { defaultModel: input.model || 'gpt-4o-mini', maxConcurrency: input.maxConcurrency || 5 },
                missionService,
                healerService
            );

            // Decompose
            const tasks = await orchestrator.decomposeGoal(input.masterPrompt, input.tools);
            const missionId = (orchestrator as any).currentMissionId;

            // Set mission priority if provided
            if (missionId && input.priority && missionService) {
                const mission = missionService.getMission(missionId);
                if (mission) {
                    mission.priority = input.priority;
                }
            }

            if (missionId) {
                activeOrchestrators.set(missionId, orchestrator);
                orchestrator.on('swarm:completed', () => activeOrchestrators.delete(missionId));
            }

            // Fire and forget
            orchestrator.executeSwarm();

            return { missionId, taskCount: tasks.length };
        }),

    resumeMission: publicProcedure
        .input(z.object({ missionId: z.string() }))
        .mutation(async ({ input }) => {
            const missionService = (global as any).mcpServerInstance?.missionService as MissionService;
            const healerService = (global as any).mcpServerInstance?.healerService;
            if (!missionService) throw new Error('MissionService unavailable');

            const orchestrator = new SwarmOrchestrator({}, missionService, healerService);
            activeOrchestrators.set(input.missionId, orchestrator);

            orchestrator.on('swarm:completed', () => activeOrchestrators.delete(input.missionId));

            // Resume - this is async but we don't await the whole swarm
            orchestrator.resumeMission(input.missionId);

            return { success: true };
        }),

    approveTask: publicProcedure
        .input(z.object({
            missionId: z.string(),
            taskId: z.string(),
            approved: z.boolean()
        }))
        .mutation(async ({ input }) => {
            const orchestrator = activeOrchestrators.get(input.missionId);
            if (!orchestrator) throw new Error('No active orchestrator found for this mission');

            const success = orchestrator.approveTask(input.taskId, input.approved);
            return { success };
        }),

    decomposeTask: publicProcedure
        .input(z.object({
            missionId: z.string(),
            taskId: z.string()
        }))
        .mutation(async ({ input }) => {
            const orchestrator = activeOrchestrators.get(input.missionId);
            if (!orchestrator) throw new Error('No active orchestrator found for this mission');

            const subMission = await orchestrator.decomposeTask(input.taskId);
            return { success: !!subMission, subMissionId: subMission?.id };
        }),

    updateTaskPriority: publicProcedure
        .input(z.object({
            missionId: z.string(),
            taskId: z.string(),
            priority: z.number().min(1).max(5)
        }))
        .mutation(async ({ input }) => {
            const missionService = (global as any).mcpServerInstance?.missionService as MissionService;
            if (!missionService) throw new Error('MissionService unavailable');

            const mission = missionService.updateMissionTask(input.missionId, input.taskId, { priority: input.priority });
            return { success: !!mission };
        }),

    executeDebate: publicProcedure
        .input(
            z.object({
                topic: z.string(),
                proponentModel: z.string(),
                opponentModel: z.string(),
                judgeModel: z.string(),
                rounds: z.number().optional()
            })
        )
        .mutation(async ({ input }: { input: { topic: string; proponentModel: string; opponentModel: string; judgeModel: string; rounds?: number } }) => {
            const debate = new DebateProtocol({
                topic: input.topic,
                proponentModel: input.proponentModel,
                opponentModel: input.opponentModel,
                judgeModel: input.judgeModel,
                maxRounds: input.rounds || 3
            });

            // Synchronous wait for simulation, standard TRPC streaming is better for prod
            const result = await debate.conductDebate();
            return result;
        }),

    seekConsensus: publicProcedure
        .input(
            z.object({
                prompt: z.string(),
                models: z.array(z.string()).min(2),
                requiredAgreement: z.number().optional()
            })
        )
        .mutation(async ({ input }: { input: { prompt: string; models: string[]; requiredAgreement?: number } }) => {
            const engine = new ConsensusEngine();

            const result = await engine.seekConsensus({
                prompt: input.prompt,
                models: input.models,
                requiredAgreementPercentage: input.requiredAgreement
            });

            return result;
        }),

    getMissionHistory: publicProcedure
        .query(async () => {
            return global.mcpServerInstance?.missionService.getAllMissions() || [];
        }),

    getMeshCapabilities: publicProcedure
        .query(async () => {
            return global.mcpServerInstance?.meshService?.getMeshCapabilities() || {};
        }),

    sendDirectMessage: publicProcedure
        .input(z.object({
            targetNodeId: z.string(),
            payload: z.any()
        }))
        .mutation(async ({ input }) => {
            const mesh = global.mcpServerInstance?.meshService;
            if (!mesh) throw new Error("MeshService not available");
            // @ts-ignore - SwarmMessageType isn't exported in the trpc context smoothly without absolute imports, use string cast
            mesh.sendDirect(input.targetNodeId, 'DIRECT_MESSAGE' as any, input.payload);
            return { success: true };
        }),
});
