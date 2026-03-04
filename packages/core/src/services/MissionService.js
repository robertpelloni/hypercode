"use strict";
/**
 * MissionService.ts
 *
 * Handles persistent storage and recovery of Swarm Missions.
 * Missions represent high-level goals decomposed into parallel tasks.
 *
 * v2.7.40: Initial implementation for Phase 80.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionService = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var crypto_1 = require("crypto");
var events_1 = require("events");
var MissionService = /** @class */ (function (_super) {
    __extends(MissionService, _super);
    function MissionService(rootDir) {
        var _this = _super.call(this) || this;
        _this.missions = new Map();
        _this.historyPath = path_1.default.join(rootDir, '.borg', 'mission_history.json');
        _this.loadMissions();
        return _this;
    }
    MissionService.prototype.loadMissions = function () {
        var _this = this;
        try {
            if (fs_1.default.existsSync(this.historyPath)) {
                var raw = fs_1.default.readFileSync(this.historyPath, 'utf-8');
                var data = JSON.parse(raw);
                data.forEach(function (m) { return _this.missions.set(m.id, m); });
                console.log("[MissionService] \uD83D\uDCC2 Loaded ".concat(this.missions.size, " missions from history."));
            }
        }
        catch (e) {
            console.warn('[MissionService] Failed to load mission history:', e);
        }
    };
    MissionService.prototype.saveMissions = function () {
        try {
            var dir = path_1.default.dirname(this.historyPath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            var data = Array.from(this.missions.values());
            fs_1.default.writeFileSync(this.historyPath, JSON.stringify(data, null, 2));
        }
        catch (e) {
            console.warn('[MissionService] Failed to save mission history:', e);
        }
    };
    /**
     * Creates a new mission and persists it.
     */
    MissionService.prototype.createMission = function (goal, tasks, parentId, priority) {
        var _a;
        if (priority === void 0) { priority = 3; }
        var mission = {
            id: crypto_1.default.randomUUID(),
            goal: goal,
            status: 'active',
            tasks: tasks,
            parentId: parentId,
            priority: priority,
            usage: { tokens: 0, estimatedMemory: 0 },
            context: {}, // Phase 90
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.missions.set(mission.id, mission);
        this.saveMissions();
        this.emit('mission:created', mission);
        // Bubble up to global event bus for Telemetry (Phase 80)
        if ((_a = global.mcpServerInstance) === null || _a === void 0 ? void 0 : _a.eventBus) {
            global.mcpServerInstance.eventBus.emitEvent('mesh:traffic', 'MissionService', {
                id: crypto_1.default.randomUUID(),
                type: 'MISSION_CREATED',
                sender: 'MissionService',
                timestamp: Date.now(),
                payload: { missionId: mission.id, goal: mission.goal }
            });
        }
        return mission;
    };
    /**
     * Updates a specific task within a mission.
     * Automatically updates mission status if all tasks are complete/failed.
     */
    MissionService.prototype.updateMissionTask = function (missionId, taskId, updates) {
        var _a;
        var mission = this.missions.get(missionId);
        if (!mission)
            return null;
        var taskIndex = mission.tasks.findIndex(function (t) { return t.id === taskId; });
        if (taskIndex === -1)
            return null;
        mission.tasks[taskIndex] = __assign(__assign({}, mission.tasks[taskIndex]), updates);
        mission.updatedAt = new Date().toISOString();
        if (updates.status === 'running')
            mission.status = 'active';
        if (mission.tasks.some(function (t) { return t.status === 'pending_approval'; }))
            mission.status = 'paused';
        if (mission.tasks.every(function (t) { return t.status === 'completed'; }))
            mission.status = 'completed';
        if (mission.tasks.some(function (t) { return t.status === 'failed'; }))
            mission.status = 'failed';
        this.saveMissions();
        this.emit('mission:updated', mission);
        // Bubble up to global event bus for Telemetry (Phase 80)
        if ((_a = global.mcpServerInstance) === null || _a === void 0 ? void 0 : _a.eventBus) {
            global.mcpServerInstance.eventBus.emitEvent('mesh:traffic', 'MissionService', {
                id: crypto_1.default.randomUUID(),
                type: 'MISSION_UPDATED',
                sender: 'MissionService',
                timestamp: Date.now(),
                payload: { missionId: mission.id, status: mission.status, taskId: taskId, taskStatus: updates.status }
            });
        }
        return mission;
    };
    /**
     * Phase 90: Updates the global shared context of a mission.
     */
    MissionService.prototype.updateMissionContext = function (missionId, diff) {
        var _a;
        var mission = this.missions.get(missionId);
        if (!mission)
            return null;
        mission.context = __assign(__assign({}, mission.context), diff);
        mission.updatedAt = new Date().toISOString();
        this.saveMissions();
        this.emit('mission:context_updated', mission);
        if ((_a = global.mcpServerInstance) === null || _a === void 0 ? void 0 : _a.eventBus) {
            global.mcpServerInstance.eventBus.emitEvent('mesh:traffic', 'MissionService', {
                id: crypto_1.default.randomUUID(),
                type: 'MISSION_CONTEXT_UPDATED',
                sender: 'MissionService',
                timestamp: Date.now(),
                payload: { missionId: mission.id, context: mission.context }
            });
        }
        return mission;
    };
    /**
     * Resumes an existing mission by resetting failed/pending tasks and setting status to active.
     */
    MissionService.prototype.resumeMission = function (missionId) {
        var _a;
        var mission = this.missions.get(missionId);
        if (!mission)
            return null;
        mission.status = 'active';
        mission.updatedAt = new Date().toISOString();
        // Reset non-completed tasks to pending
        mission.tasks = mission.tasks.map(function (t) {
            return t.status !== 'completed' ? __assign(__assign({}, t), { status: 'pending' }) : t;
        });
        this.saveMissions();
        this.emit('mission:resumed', mission);
        if ((_a = global.mcpServerInstance) === null || _a === void 0 ? void 0 : _a.eventBus) {
            global.mcpServerInstance.eventBus.emitEvent('mesh:traffic', 'MissionService', {
                id: crypto_1.default.randomUUID(),
                type: 'MISSION_RESUMED',
                sender: 'MissionService',
                timestamp: Date.now(),
                payload: { missionId: mission.id }
            });
        }
        return mission;
    };
    MissionService.prototype.getMission = function (id) {
        return this.missions.get(id);
    };
    MissionService.prototype.getAllMissions = function () {
        return Array.from(this.missions.values()).sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    };
    /**
     * Returns active missions that might need recovery.
     */
    MissionService.prototype.getActiveMissions = function () {
        return Array.from(this.missions.values()).filter(function (m) { return m.status === 'active' || m.status === 'paused'; });
    };
    return MissionService;
}(events_1.EventEmitter));
exports.MissionService = MissionService;
