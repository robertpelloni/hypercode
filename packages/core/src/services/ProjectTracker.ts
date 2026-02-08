
import fs from 'fs';
import path from 'path';

export interface ProjectTask {
    id: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    sourceFile: string;
    lineNumber: number;
}

export class ProjectTracker {
    private rootDir: string;

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    /**
     * Scans task.md and ROADMAP.md for the next actionable task.
     * Priority: 
     * 1. In Progress (but not done) in task.md
     * 2. Todo in task.md
     * 3. In Progress in ROADMAP.md
     * 4. Todo in ROADMAP.md
     */
    public getNextTask(): ProjectTask | null {
        const taskMdPath = path.join(this.rootDir, '.gemini/antigravity/brain/3f267825-b33e-44e9-957c-3d4ff1b84eb6/task.md'); // Adjust path as needed or make configurable
        // Fallback to local task.md if brain path doesn't exist (dev mode)
        const localTaskMd = path.join(this.rootDir, 'task.md');

        let targetPath = fs.existsSync(taskMdPath) ? taskMdPath : (fs.existsSync(localTaskMd) ? localTaskMd : null);

        if (targetPath) {
            const task = this.findTaskInFile(targetPath);
            if (task) return task;
        }

        const roadmapPath = path.join(this.rootDir, 'ROADMAP.md');
        if (fs.existsSync(roadmapPath)) {
            const task = this.findTaskInFile(roadmapPath);
            if (task) return task;
        }

        return null;
    }

    private findTaskInFile(filePath: string): ProjectTask | null {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // 1. Check for In Progress task: - [/]
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^\s*-\s*\[\/\]\s*(.*)$/);
            if (match) {
                // Check if it has a sub-task that is NOT done
                // Actually, if a parent is [/], we should look for its children.
                // But specifically for the Director, we want the leaf node.

                // Simple heuristic: If this line is [/], check if next lines are indented tasks.
                // If yes, pick the first [ ] child.
                // If no children, pick this one.

                const subTask = this.findFirstSubTask(lines, i + 1);
                if (subTask) {
                    return {
                        id: `task-${path.basename(filePath)}-${subTask.line}`,
                        description: subTask.text,
                        status: 'TODO',
                        sourceFile: filePath,
                        lineNumber: subTask.line
                    };
                }

                return {
                    id: `task-${path.basename(filePath)}-${i + 1}`,
                    description: match[1].trim(),
                    status: 'IN_PROGRESS',
                    sourceFile: filePath,
                    lineNumber: i + 1
                };
            }
        }

        // 2. Check for Todo task: - [ ]
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^\s*-\s*\[ \]\s*(.*)$/);
            if (match) {
                return {
                    id: `task-${path.basename(filePath)}-${i + 1}`,
                    description: match[1].trim(),
                    status: 'TODO',
                    sourceFile: filePath,
                    lineNumber: i + 1
                };
            }
        }

        return null;
    }

    private findFirstSubTask(lines: string[], startIndex: number): { text: string, line: number } | null {
        let parentIndent = -1;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue;

            const match = line.match(/^(\s*)-\s*\[([ x/])\]\s*(.*)$/);
            if (!match) {
                // If we hit a non-list item that isn't empty, stop? 
                // Or maybe header.
                if (line.match(/^#/)) break;
                continue;
            };

            const indent = match[1].length;
            const state = match[2]; // ' ', 'x', '/'
            const text = match[3];

            // If we encounter a new parent (less indent), stop
            // Wait, we need to know the parent indent of the calls site.
            // Simplified: Just take the first [ ] or [/] we find that looks like a task
            if (state === ' ' || state === '/') {
                return { text, line: i + 1 };
            }
        }
        return null;
    }

    public completeTask(task: ProjectTask): void {
        const content = fs.readFileSync(task.sourceFile, 'utf-8');
        const lines = content.split('\n');

        if (lines[task.lineNumber - 1]) {
            lines[task.lineNumber - 1] = lines[task.lineNumber - 1].replace('[ ]', '[x]').replace('[/]', '[x]');
            fs.writeFileSync(task.sourceFile, lines.join('\n'));
            console.log(`[ProjectTracker] Marked task as done: ${task.description}`);
        }
    }

    public startTask(task: ProjectTask): void {
        const content = fs.readFileSync(task.sourceFile, 'utf-8');
        const lines = content.split('\n');

        if (lines[task.lineNumber - 1]) {
            lines[task.lineNumber - 1] = lines[task.lineNumber - 1].replace('[ ]', '[/]');
            fs.writeFileSync(task.sourceFile, lines.join('\n'));
            console.log(`[ProjectTracker] Marked task as in-progress: ${task.description}`);
        }
    }
}
