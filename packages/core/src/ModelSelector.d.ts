export interface ModelSelectionRequest {
    provider?: string;
    taskComplexity?: 'low' | 'medium' | 'high';
    taskType?: 'worker' | 'supervisor';
    routingTaskType?: 'coding' | 'planning' | 'research' | 'general' | 'worker' | 'supervisor';
}
export interface SelectedModel {
    provider: string;
    modelId: string;
    reason: string;
    systemPrompt?: string;
}
export declare class ModelSelector {
    private modelStates;
    private configPath;
    constructor();
    reportFailure(modelId: string): void;
    private loadConfig;
    selectModel(req: ModelSelectionRequest): Promise<SelectedModel>;
}
//# sourceMappingURL=ModelSelector.d.ts.map