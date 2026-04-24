export class ProcessRegistry {
    static activeProcesses = new Map();
    static register(id, process) {
        this.activeProcesses.set(id, process);
    }
    static unregister(id) {
        this.activeProcesses.delete(id);
    }
    static getLatest() {
        // Return the most recently added process (heuristic)
        if (this.activeProcesses.size === 0)
            return undefined;
        return Array.from(this.activeProcesses.values()).pop();
    }
}
