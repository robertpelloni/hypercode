import { ChildProcess } from 'child_process';

interface ManagedProcess {
    pid: number;
    command: string;
    startTime: number;
    process: ChildProcess;
}

export class ProcessRegistry {
    private processes: Map<number, ManagedProcess> = new Map();

    register(proc: ChildProcess, command: string) {
        if (!proc.pid) return;
        this.processes.set(proc.pid, {
            pid: proc.pid,
            command,
            startTime: Date.now(),
            process: proc
        });

        proc.on('exit', () => {
            if (proc.pid) this.processes.delete(proc.pid);
        });
    }

    killAll() {
        for (const [pid, info] of this.processes) {
            try {
                console.log(`[ProcessRegistry] Killing ${info.command} (${pid})...`);
                // Windows often needs tree-kill, but simple kill for now
                info.process.kill();
            } catch (e) {
                console.error(`[ProcessRegistry] Failed to kill ${pid}:`, e);
            }
        }
        this.processes.clear();
    }

    list() {
        return Array.from(this.processes.values()).map(p => ({
            pid: p.pid,
            command: p.command,
            uptime: Date.now() - p.startTime
        }));
    }
}
