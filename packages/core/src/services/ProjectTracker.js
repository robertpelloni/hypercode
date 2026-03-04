"use strict";
/**
 * ProjectTracker
 *
 * Scans `task.md` and `ROADMAP.md` for the next actionable task and provides
 * progress metrics for the Director and dashboard.
 *
 * Architecture:
 * - Reads markdown task lists (`- [ ]`, `- [/]`, `- [x]`) to determine task state
 * - Supports nested sub-tasks (indentation-based hierarchy)
 * - Validates parsed task lines with Zod schemas
 * - Can mark tasks as started (`[/]`) or completed (`[x]`) by rewriting the source file
 *
 * State Persistence (Phase 62-8 Hardening):
 * - Maintains a JSON history file (`.borg/tracker_history.json`) for durable state
 * - Records completed tasks with timestamps for audit trail
 * - History survives markdown file rewrites and provides historical context
 *
 * Integration:
 * - Used by `Director` to auto-select idle tasks (Phase 59)
 * - Exposed via `systemProcedures.ts` → `getTaskStatus` tRPC route
 * - Dashboard shows real progress percentage from this service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTracker = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var zod_1 = require("zod");
/** Zod schema for validating parsed checkbox states */
var TaskStateSchema = zod_1.z.enum([' ', 'x', '/']);
/** Zod schema for validating a fully parsed task line */
var ParsedTaskLineSchema = zod_1.z.object({
    indent: zod_1.z.number().int().nonnegative(),
    state: TaskStateSchema,
    text: zod_1.z.string().min(1),
    lineNumber: zod_1.z.number().int().positive(),
});
var ProjectTracker = /** @class */ (function () {
    function ProjectTracker(rootDir) {
        this.rootDir = rootDir;
        // Store history in .borg directory to keep project root clean
        this.historyPath = path_1.default.join(rootDir, '.borg', 'tracker_history.json');
    }
    /**
     * Scans task.md and ROADMAP.md for the next actionable task.
     * Priority:
     * 1. In Progress (but not done) in task.md
     * 2. Todo in task.md
     * 3. In Progress in ROADMAP.md
     * 4. Todo in ROADMAP.md
     */
    ProjectTracker.prototype.getNextTask = function () {
        // Default to local task.md in root
        var localTaskMd = path_1.default.join(this.rootDir, 'task.md');
        var docsTaskMd = path_1.default.join(this.rootDir, 'docs', 'task.md');
        var targetPath = fs_1.default.existsSync(localTaskMd) ? localTaskMd : (fs_1.default.existsSync(docsTaskMd) ? docsTaskMd : null);
        if (targetPath) {
            var task = this.findTaskInFile(targetPath);
            if (task)
                return task;
        }
        var roadmapPath = path_1.default.join(this.rootDir, 'ROADMAP.md');
        if (fs_1.default.existsSync(roadmapPath)) {
            var task = this.findTaskInFile(roadmapPath);
            if (task)
                return task;
        }
        return null;
    };
    /**
     * Returns overall project progress metrics.
     * Counts all checkbox items in task.md and calculates completion percentage.
     */
    ProjectTracker.prototype.getStatus = function () {
        var taskMdPath = path_1.default.join(this.rootDir, 'task.md');
        var total = 0;
        var done = 0;
        if (fs_1.default.existsSync(taskMdPath)) {
            var content = fs_1.default.readFileSync(taskMdPath, 'utf-8');
            total += (content.match(/-\s*\[[ x/]\]/g) || []).length;
            done += (content.match(/-\s*\[x\]/g) || []).length;
        }
        var currentTask = this.getNextTask();
        return {
            taskId: currentTask ? currentTask.id : 'idle',
            status: currentTask ? 'busy' : 'idle',
            progress: total > 0 ? Math.round((done / total) * 100) : 0,
            currentTask: currentTask ? currentTask.description : 'Idle'
        };
    };
    /**
     * Returns the task completion history from the persistent JSON file.
     * Used for audit trail and dashboard display of completed work.
     */
    ProjectTracker.prototype.getHistory = function () {
        try {
            if (fs_1.default.existsSync(this.historyPath)) {
                var raw = fs_1.default.readFileSync(this.historyPath, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch (e) {
            console.warn('[ProjectTracker] Failed to read history:', e);
        }
        return [];
    };
    /**
     * Appends a completed task to the persistent history file.
     * Creates the .borg directory if it doesn't exist.
     */
    ProjectTracker.prototype.appendToHistory = function (task) {
        try {
            var history_1 = this.getHistory();
            history_1.push({
                id: task.id,
                description: task.description,
                completedAt: new Date().toISOString(),
                sourceFile: task.sourceFile,
            });
            // Ensure .borg directory exists
            var dir = path_1.default.dirname(this.historyPath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            fs_1.default.writeFileSync(this.historyPath, JSON.stringify(history_1, null, 2));
        }
        catch (e) {
            console.warn('[ProjectTracker] Failed to write history:', e);
        }
    };
    /**
     * Searches a markdown file for the first actionable task.
     * Priority: In-progress tasks first, then todo tasks.
     * For in-progress parents, drills down to find the first incomplete sub-task.
     */
    ProjectTracker.prototype.findTaskInFile = function (filePath) {
        var content = fs_1.default.readFileSync(filePath, 'utf-8');
        var lines = content.split('\n');
        // 1. Check for In Progress task: - [/]
        for (var i = 0; i < lines.length; i++) {
            var parsed = this.parseTaskLine(lines[i], i + 1);
            if ((parsed === null || parsed === void 0 ? void 0 : parsed.state) === '/') {
                var subTask = this.findFirstSubTask(lines, i + 1, parsed.indent);
                if (subTask) {
                    return {
                        id: "task-".concat(path_1.default.basename(filePath), "-").concat(subTask.line),
                        description: subTask.text,
                        status: 'TODO',
                        sourceFile: filePath,
                        lineNumber: subTask.line
                    };
                }
                return {
                    id: "task-".concat(path_1.default.basename(filePath), "-").concat(i + 1),
                    description: parsed.text,
                    status: 'IN_PROGRESS',
                    sourceFile: filePath,
                    lineNumber: i + 1
                };
            }
        }
        // 2. Check for Todo task: - [ ]
        for (var i = 0; i < lines.length; i++) {
            var parsed = this.parseTaskLine(lines[i], i + 1);
            if ((parsed === null || parsed === void 0 ? void 0 : parsed.state) === ' ') {
                return {
                    id: "task-".concat(path_1.default.basename(filePath), "-").concat(i + 1),
                    description: parsed.text,
                    status: 'TODO',
                    sourceFile: filePath,
                    lineNumber: i + 1
                };
            }
        }
        return null;
    };
    /**
     * Parses a single line of markdown for a task checkbox pattern.
     * Regex matches: `- [ ] task text`, `- [x] task text`, `- [/] task text`
     * with optional leading whitespace for indentation.
     */
    ProjectTracker.prototype.parseTaskLine = function (line, lineNumber) {
        var match = line.match(/^(\s*)-\s*\[([ x/])\]\s*(.+?)\s*$/);
        if (!match) {
            return null;
        }
        var parsed = ParsedTaskLineSchema.safeParse({
            indent: match[1].length,
            state: match[2],
            text: match[3].trim(),
            lineNumber: lineNumber,
        });
        return parsed.success ? parsed.data : null;
    };
    /**
     * Starting from `startIndex`, finds the first incomplete sub-task
     * (deeper indentation than `parentIndent`).
     * Stops when encountering a sibling or parent-level item, or a heading.
     */
    ProjectTracker.prototype.findFirstSubTask = function (lines, startIndex, parentIndent) {
        for (var i = startIndex; i < lines.length; i++) {
            var line = lines[i];
            if (line.trim() === '')
                continue;
            var parsed = this.parseTaskLine(line, i + 1);
            if (!parsed) {
                if (line.match(/^\s*#/))
                    break;
                continue;
            }
            if (parsed.indent <= parentIndent) {
                break;
            }
            if (parsed.state === ' ' || parsed.state === '/') {
                return { text: parsed.text, line: parsed.lineNumber };
            }
        }
        return null;
    };
    /**
     * Marks a task as completed ([x]) in its source markdown file.
     * Also records the completion in the persistent JSON history.
     */
    ProjectTracker.prototype.completeTask = function (task) {
        var content = fs_1.default.readFileSync(task.sourceFile, 'utf-8');
        var lines = content.split('\n');
        if (lines[task.lineNumber - 1]) {
            lines[task.lineNumber - 1] = lines[task.lineNumber - 1].replace('[ ]', '[x]').replace('[/]', '[x]');
            fs_1.default.writeFileSync(task.sourceFile, lines.join('\n'));
            console.log("[ProjectTracker] Marked task as done: ".concat(task.description));
            // Persist to JSON history for audit trail
            this.appendToHistory(task);
        }
    };
    /**
     * Marks a task as in-progress ([/]) in its source markdown file.
     */
    ProjectTracker.prototype.startTask = function (task) {
        var content = fs_1.default.readFileSync(task.sourceFile, 'utf-8');
        var lines = content.split('\n');
        if (lines[task.lineNumber - 1]) {
            lines[task.lineNumber - 1] = lines[task.lineNumber - 1].replace('[ ]', '[/]');
            fs_1.default.writeFileSync(task.sourceFile, lines.join('\n'));
            console.log("[ProjectTracker] Marked task as in-progress: ".concat(task.description));
        }
    };
    return ProjectTracker;
}());
exports.ProjectTracker = ProjectTracker;
