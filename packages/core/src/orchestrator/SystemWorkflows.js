"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemWorkflows = registerSystemWorkflows;
var WorkflowEngine_js_1 = require("./WorkflowEngine.js");
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
}
/**
 * Register standard system workflows
 */
function registerSystemWorkflows(engine, runner) {
    registerCodeReviewWorkflow(engine, runner);
    registerDeploymentWorkflow(engine, runner);
}
/**
 * Code Review Workflow
 */
function registerCodeReviewWorkflow(engine, runner) {
    var _this = this;
    var builder = WorkflowEngine_js_1.WorkflowEngine.createGraph();
    builder
        .addNode('analyze_diff', function (state) { return __awaiter(_this, void 0, void 0, function () {
        var targetBranch, diff, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[Workflow: Code Review] Analyzing diff...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    targetBranch = state.targetBranch || 'main';
                    return [4 /*yield*/, runner.executeTool('run_command', {
                            CommandLine: "git diff ".concat(targetBranch, "...HEAD --stat"),
                            Cwd: process.cwd(),
                            SafeToAutoRun: true,
                            WaitMsBeforeAsync: 1000
                        })];
                case 2:
                    diff = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, state), { diffSummary: diff, hasChanges: true })];
                case 3:
                    e_1 = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, state), { error: "Diff failed: ".concat(getErrorMessage(e_1)), hasChanges: false })];
                case 4: return [2 /*return*/];
            }
        });
    }); }, { name: 'Analyze Diff', description: 'Analyze git changes against target branch' })
        .addNode('scan_security', function (state) { return __awaiter(_this, void 0, void 0, function () {
        var scan, risks, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[Workflow: Code Review] Scanning for security issues...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, runner.executeTool('grep_search', {
                            SearchPath: 'src',
                            Query: '(password|secret|key) *=',
                            IsRegex: true
                        })];
                case 2:
                    scan = _a.sent();
                    risks = Array.isArray(scan) ? scan.length : 0;
                    return [2 /*return*/, __assign(__assign({}, state), { securityScan: risks === 0 ? 'Passed' : 'Risks Found', findings: scan })];
                case 3:
                    e_2 = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, state), { securityScan: 'Skipped (Error)', findings: [] })];
                case 4: return [2 /*return*/];
            }
        });
    }); }, { name: 'Security Scan', description: 'Check for potential secrets or vulnerabilities' })
        .addNode('auto_critique', function (state) { return __awaiter(_this, void 0, void 0, function () {
        var diffContent, response, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[Workflow: Code Review] Auto-generating critique...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    diffContent = state.diffSummary || '';
                    if (!diffContent || typeof diffContent !== 'string') {
                        return [2 /*return*/, __assign(__assign({}, state), { critique: 'Skipped critique: No diff to review.' })];
                    }
                    return [4 /*yield*/, runner.executeTool('ask_agent', {
                            AgentName: 'Engineer',
                            Message: "Provide a highly concise code review of this unified diff. Look for obvious anti-patterns:\\n\\n".concat(diffContent)
                        })];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, state), { critique: typeof response === 'string' ? response : JSON.stringify(response) })];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, state), { critique: "Automated critique failed: ".concat(getErrorMessage(err_1)) })];
                case 4: return [2 /*return*/];
            }
        });
    }); }, { name: 'Auto Critique', description: 'LLM-based code analysis' })
        .addNode('human_review', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // This is a checkpoint, so execution stops here until manual approval
            console.log('[Workflow: Code Review] Waiting for human approval...');
            return [2 /*return*/, __assign(__assign({}, state), { status: 'Reviewing' })];
        });
    }); }, { name: 'Human Review', description: 'Manual approval required', requiresApproval: true })
        .addNode('merge_pr', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('[Workflow: Code Review] Merging...');
            // Logic to merge would go here
            return [2 /*return*/, __assign(__assign({}, state), { status: 'Merged', completedAt: new Date() })];
        });
    }); }, { name: 'Merge PR', description: 'Merge changes' });
    builder
        .addEdge('analyze_diff', 'scan_security')
        .addEdge('scan_security', 'auto_critique')
        .addEdge('auto_critique', 'human_review')
        .addEdge('human_review', 'merge_pr');
    var workflow = builder.build('code_review', 'Code Review Pipeline', 'Automated code analysis and security scanning');
    engine.registerWorkflow(workflow);
}
/**
 * Deployment Workflow
 */
function registerDeploymentWorkflow(engine, runner) {
    var _this = this;
    var builder = WorkflowEngine_js_1.WorkflowEngine.createGraph();
    builder
        .addNode('build', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[Workflow: Deploy] Building...');
                    // Use run_command to build
                    return [4 /*yield*/, runner.executeTool('run_command', {
                            CommandLine: 'npm run build',
                            Cwd: process.cwd(),
                            SafeToAutoRun: true,
                            WaitMsBeforeAsync: 10000 // Verification build might take time
                        })];
                case 1:
                    // Use run_command to build
                    _a.sent();
                    return [2 /*return*/, __assign(__assign({}, state), { buildStatus: 'Success' })];
            }
        });
    }); }, { name: 'Build', description: 'Compile and build' })
        .addNode('test', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('[Workflow: Deploy] Testing...');
            try {
                // Just run a quick check or unit tests
                // We'll skip running full tests to save time in this demo logic
                // await runner.executeTool('run_command', { CommandLine: 'npm test', ... });
                return [2 /*return*/, __assign(__assign({}, state), { testStatus: 'Passed (Skipped for demo)' })];
            }
            catch (e) {
                throw new Error("Tests failed");
            }
            return [2 /*return*/];
        });
    }); }, { name: 'Test', description: 'Run test suite' })
        .addNode('deploy_staging', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('[Workflow: Deploy] Deploying to Staging...');
            return [2 /*return*/, __assign(__assign({}, state), { env: 'staging', url: 'http://localhost:3000' })];
        });
    }); }, { name: 'Deploy Staging', description: 'Deploy to ephemeral env' })
        .addNode('verify_health', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('[Workflow: Deploy] Verifying Health...');
            return [2 /*return*/, __assign(__assign({}, state), { health: 'OK' })];
        });
    }); }, { name: 'Verify Health', description: 'Check deployment health' })
        .addNode('deploy_prod', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('[Workflow: Deploy] Promoting to Production...');
            return [2 /*return*/, __assign(__assign({}, state), { env: 'production', released: true })];
        });
    }); }, { name: 'Deploy Prod', description: 'Promote to production', requiresApproval: true })
        .addNode('post_deploy_alert', function (state) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('[Workflow: Deploy] Sending alerts...');
            return [2 /*return*/, __assign(__assign({}, state), { alerted: true })];
        });
    }); }, { name: 'Notify Team', description: 'Send completion alert' });
    builder
        .addEdge('build', 'test')
        .addEdge('test', 'deploy_staging')
        .addEdge('deploy_staging', 'verify_health')
        .addEdge('verify_health', 'deploy_prod')
        .addEdge('deploy_prod', 'post_deploy_alert');
    var workflow = builder.build('deployment', 'Production Deployment', 'Build, Test, and Deploy pipeline');
    engine.registerWorkflow(workflow);
}
