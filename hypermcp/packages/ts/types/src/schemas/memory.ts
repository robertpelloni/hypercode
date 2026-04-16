import { z } from 'zod';

export const memoryInterchangeFormatSchema = z.enum(['json', 'csv', 'jsonl', 'json-provider', 'sectioned-memory-store']);
export type MemoryInterchangeFormat = z.infer<typeof memoryInterchangeFormatSchema>;

export const observationTypeSchema = z.enum(['discovery', 'decision', 'progress', 'warning', 'fix']);
export type ObservationType = z.infer<typeof observationTypeSchema>;

export const memoryTypeSchema = z.enum(['session', 'working', 'long_term']);
export type MemoryType = z.infer<typeof memoryTypeSchema>;

export const memoryNamespaceSchema = z.enum(['user', 'agent', 'project']);
export type MemoryNamespace = z.infer<typeof memoryNamespaceSchema>;

export const userPromptRoleSchema = z.enum(['goal', 'objective', 'prompt']);
export type UserPromptRole = z.infer<typeof userPromptRoleSchema>;

export const memoryPivotKindSchema = z.enum(['session', 'tool', 'concept', 'file', 'goal', 'objective']);
export type MemoryPivotKind = z.infer<typeof memoryPivotKindSchema>;

export const structuredObservationSchema = z.object({
    toolName: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    narrative: z.string().optional(),
    rawInput: z.unknown().optional(),
    rawOutput: z.unknown().optional(),
    facts: z.array(z.string()).optional(),
    concepts: z.array(z.string()).optional(),
    filesRead: z.array(z.string()).optional(),
    filesModified: z.array(z.string()).optional(),
    type: observationTypeSchema.optional(),
    namespace: memoryNamespaceSchema.default('project'),
    metadata: z.record(z.unknown()).optional(),
});
export type StructuredObservationInput = z.infer<typeof structuredObservationSchema>;

export const structuredUserPromptSchema = z.object({
    content: z.string().min(1),
    role: userPromptRoleSchema.default('prompt'),
    sessionId: z.string().optional(),
    activeGoal: z.string().nullable().optional(),
    lastObjective: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
});
export type StructuredUserPromptInput = z.infer<typeof structuredUserPromptSchema>;

export const getRecentObservationsInputSchema = z.object({
    limit: z.number().optional().default(10),
    namespace: memoryNamespaceSchema.optional(),
    type: observationTypeSchema.optional(),
}).optional().default({ limit: 10 });

export const searchObservationsInputSchema = z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
    namespace: memoryNamespaceSchema.optional(),
    type: observationTypeSchema.optional(),
});

export const getRecentUserPromptsInputSchema = z.object({
    limit: z.number().optional().default(10),
    role: userPromptRoleSchema.optional(),
}).optional().default({ limit: 10 });

export const searchUserPromptsInputSchema = z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
    role: userPromptRoleSchema.optional(),
});

export const searchMemoryPivotInputSchema = z.object({
    pivot: memoryPivotKindSchema,
    value: z.string().min(1),
    limit: z.number().optional().default(20),
});
export type SearchMemoryPivotInput = z.infer<typeof searchMemoryPivotInputSchema>;

export const getMemoryTimelineWindowInputSchema = z.object({
    sessionId: z.string().min(1),
    anchorTimestamp: z.number(),
    before: z.number().int().min(0).max(10).optional().default(3),
    after: z.number().int().min(0).max(10).optional().default(3),
});
export type GetMemoryTimelineWindowInput = z.infer<typeof getMemoryTimelineWindowInputSchema>;

export const getCrossSessionMemoryLinksInputSchema = z.object({
    memoryId: z.string().min(1),
    limit: z.number().int().min(1).max(10).optional().default(5),
});
export type GetCrossSessionMemoryLinksInput = z.infer<typeof getCrossSessionMemoryLinksInputSchema>;
