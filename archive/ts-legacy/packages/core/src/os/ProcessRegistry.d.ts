import { ChildProcess } from 'child_process';
export declare class ProcessRegistry {
    private static activeProcesses;
    static register(id: string, process: ChildProcess): void;
    static unregister(id: string): void;
    static getLatest(): ChildProcess | undefined;
}
//# sourceMappingURL=ProcessRegistry.d.ts.map