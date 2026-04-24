import { z } from 'zod';

export const HypercodeStatsSchema = z.object({
	totalCount: z.number(),
	sessionCount: z.number(),
	workingCount: z.number(),
	longTermCount: z.number(),
	observationCount: z.number(),
	uniqueObservationCount: z.number(),
	promptCount: z.number(),
	sessionSummaryCount: z.number(),
	session: z.number(),
	working: z.number(),
	long_term: z.number(),
	user: z.number(),
	agent: z.number(),
	project: z.number(),
	discovery: z.number(),
	decision: z.number(),
	progress: z.number(),
	warning: z.number(),
	fix: z.number(),
});

export const HypercodeContextItemSchema = z.object({
	content: z.string(),
	metadata: z
		.object({
			source: z.string(),
			tags: z.array(z.string()),
			toolName: z.string().optional(),
			query: z.string().optional(),
			matchedPaths: z.array(z.string()).optional(),
			observationCount: z.number().optional(),
			summaryCount: z.number().optional(),
			preview: z.string().optional(),
		})
		.catchall(z.any()),
});

export const HypercodeKnowledgeItemSchema = z.object({
	type: z.enum(['discovery', 'decision', 'fix', 'warning', 'pattern']),
	content: z.string(),
	source: z.string(),
	timestamp: z.number(),
	metadata: z.record(z.string(), z.any()).optional(),
});

export const MaestroMetadataSchema = z.object({
	teamLogic: z.string().optional(),
	phaseDependencies: z.array(z.string()).optional(),
	currentPhase: z.number().optional(),
	totalPhases: z.number().optional(),
	sessionId: z.string(),
	workflowMode: z.enum(['standard', 'express']).optional(),
	status: z.string().optional(),
});

export const HypercodeHandoffSchema = z.object({
	version: z.string(),
	timestamp: z.number(),
	sessionId: z.string(),
	stats: HypercodeStatsSchema,
	recentContext: z.array(HypercodeContextItemSchema),
	knowledge: z.array(HypercodeKnowledgeItemSchema).optional(),
	notes: z.string().optional(),
	maestro: MaestroMetadataSchema.optional(),
});

export const HypercodeSettingsPayloadSchema = z.object({
	settings: z.record(z.string(), z.any()),
});

export const HypercodePlaybooksPayloadSchema = z.array(z.record(z.string(), z.any()));

export type HypercodeHandoff = z.infer<typeof HypercodeHandoffSchema>;
export type HypercodeKnowledgeItem = z.infer<typeof HypercodeKnowledgeItemSchema>;
export type HypercodeSettingsPayload = z.infer<typeof HypercodeSettingsPayloadSchema>;
export type HypercodePlaybooksPayload = z.infer<typeof HypercodePlaybooksPayloadSchema>;
