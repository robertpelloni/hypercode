
export interface IAgent {
    start(): Promise<void>;
    send(message: string, context?: any): Promise<string>;
    isActive(): boolean;
    reset(): void;
}
