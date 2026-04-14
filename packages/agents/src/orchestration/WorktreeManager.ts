import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = util.promisify(exec);

export class WorktreeManager {
    private rootDir: string;
    private worktreeRoot: string;

    constructor(rootDir: string = process.cwd()) {
        this.rootDir = rootDir;
        this.worktreeRoot = path.join(rootDir, '.hypercode', 'worktrees');
    }

    /**
     * Creates a new isolated environment (worktree) for a task.
     * @param taskId Unique ID for the task
     * @param baseBranch Branch to branch off from (default: main)
     * @returns Absolute path to the worktree
     */
    async createTaskEnvironment(taskId: string, baseBranch: string = 'main'): Promise<string> {
        const branchName = `task/${taskId}`;
        const worktreePath = path.join(this.worktreeRoot, taskId);

        // Ensure .hypercode/worktrees exists (mkdir handled by git usually, but parent needed)
        await fs.mkdir(this.worktreeRoot, { recursive: true });

        // Check if branch exists, if so, just use it? Or error?
        // Ideally we create a new branch.

        try {
            console.log(`[WorktreeManager] Creating worktree for ${taskId} at ${worktreePath}`);
            // git worktree add -b <new-branch> <path> <start-point>
            await execAsync(`git worktree add -b ${branchName} ${worktreePath} ${baseBranch}`, { cwd: this.rootDir });
            return worktreePath;
        } catch (e: any) {
            // Check if it's because branch already exists
            if (e.stdout?.includes('already exists')) {
                // Try checking it out without -b
                await execAsync(`git worktree add ${worktreePath} ${branchName}`, { cwd: this.rootDir });
                return worktreePath;
            }
            throw new Error(`Failed to create worktree: ${e.message}`);
        }
    }

    /**
     * Cleans up the worktree and deletes the directory.
     * Does NOT delete the branch (that happens after merge).
     */
    async cleanupTaskEnvironment(taskId: string) {
        const worktreePath = path.join(this.worktreeRoot, taskId);
        try {
            console.log(`[WorktreeManager] Cleaning up worktree ${taskId}`);
            await execAsync(`git worktree remove ${worktreePath} --force`, { cwd: this.rootDir });

            // Allow manual pruning if needed
            // await execAsync(`git worktree prune`, { cwd: this.rootDir });
        } catch (e: any) {
            console.error(`[WorktreeManager] Cleanup warning: ${e.message}`);
        }
    }

    /**
     * Merges the task branch back into main (or base).
     * This operation usually happens in the MAIN repo, not the worktree.
     */
    async mergeTask(taskId: string, targetBranch: string = 'main') {
        const branchName = `task/${taskId}`;
        try {
            console.log(`[WorktreeManager] Merging ${branchName} into ${targetBranch}`);
            await execAsync(`git checkout ${targetBranch} && git merge ${branchName} --squash --author="HyperCode <hypercode@system>" -m "task: ${taskId}"`, { cwd: this.rootDir });
            // Don't push yet, let Director decide.
        } catch (e: any) {
            throw new Error(`Merge failed: ${e.message}`);
        }
    }
}
