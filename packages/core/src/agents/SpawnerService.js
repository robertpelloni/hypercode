"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpawnerService = void 0;
var BaseAgent_js_1 = require("./BaseAgent.js");
var SubAgents_js_1 = require("./SubAgents.js");
var SpawnerService = /** @class */ (function () {
    function SpawnerService() {
        this.agents = new Map();
        this.server = null;
    }
    SpawnerService.getInstance = function () {
        if (!SpawnerService.instance) {
            SpawnerService.instance = new SpawnerService();
        }
        return SpawnerService.instance;
    };
    SpawnerService.prototype.setServer = function (server) {
        this.server = server;
    };
    /**
     * Reason: `BaseAgent.fail` is protected, but termination needs an emergency state transition.
     * What: Uses reflection to invoke the internal fail hook when available.
     * Why: Preserves current termination behavior without a broad cast on agent internals.
     */
    SpawnerService.prototype.invokeAgentFail = function (agent, message) {
        var failMethod = Reflect.get(agent, 'fail');
        if (typeof failMethod !== 'function') {
            return false;
        }
        Reflect.apply(failMethod, agent, [message]);
        return true;
    };
    SpawnerService.prototype.spawn = function (type, task) {
        if (!this.server) {
            throw new Error("SpawnerService not initialized with MCPServer");
        }
        var agent;
        switch (type) {
            case 'research':
                agent = new SubAgents_js_1.ResearchAgent(task, this.server);
                break;
            case 'code':
                agent = new SubAgents_js_1.CodeAgent(task, this.server);
                break;
            default:
                throw new Error("Unknown agent type: ".concat(type));
        }
        this.agents.set(agent.id, agent);
        // Start agent asynchronously
        agent.run().catch(function (err) {
            console.error("[Spawner] Agent ".concat(agent.id, " crashed:"), err);
        });
        return agent.id;
    };
    SpawnerService.prototype.listAgents = function () {
        return Array.from(this.agents.values()).map(function (a) { return ({
            id: a.id,
            type: a.type,
            status: a.status,
            task: a.task,
            createdAt: a.createdAt,
            result: a.result
        }); });
    };
    SpawnerService.prototype.getAgent = function (id) {
        return this.agents.get(id);
    };
    SpawnerService.prototype.killAgent = function (id) {
        var agent = this.agents.get(id);
        if (agent && agent.status === BaseAgent_js_1.AgentStatus.RUNNING) {
            // In a real implementation we'd need an abort controller
            // For now, we just mark as failed
            return this.invokeAgentFail(agent, "Terminated by user");
        }
        return false;
    };
    return SpawnerService;
}());
exports.SpawnerService = SpawnerService;
