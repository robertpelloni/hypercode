"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = exports.AgentStatus = void 0;
var uuid_1 = require("uuid");
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "idle";
    AgentStatus["RUNNING"] = "running";
    AgentStatus["COMPLETED"] = "completed";
    AgentStatus["FAILED"] = "failed";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var BaseAgent = /** @class */ (function () {
    function BaseAgent(type, task) {
        this.status = AgentStatus.IDLE;
        this.result = null;
        this.logs = [];
        this.id = (0, uuid_1.v4)();
        this.type = type;
        this.task = task;
        this.createdAt = new Date();
    }
    BaseAgent.prototype.log = function (message) {
        var timestamp = new Date().toISOString();
        var logEntry = "[".concat(timestamp, "] [").concat(this.type, ":").concat(this.id.substring(0, 8), "] ").concat(message);
        this.logs.push(logEntry);
        console.log(logEntry);
    };
    BaseAgent.prototype.complete = function (output) {
        this.status = AgentStatus.COMPLETED;
        this.result = { success: true, output: output };
        this.log("Task completed: ".concat(output.substring(0, 100), "..."));
    };
    BaseAgent.prototype.fail = function (error) {
        this.status = AgentStatus.FAILED;
        this.result = { success: false, output: '', error: error };
        this.log("Task failed: ".concat(error));
    };
    return BaseAgent;
}());
exports.BaseAgent = BaseAgent;
