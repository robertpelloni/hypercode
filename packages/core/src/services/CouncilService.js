"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouncilService = void 0;
var uuid_1 = require("uuid");
var CouncilService = /** @class */ (function () {
    function CouncilService() {
        this.sessions = new Map();
        this.agents = new Map();
    }
    CouncilService.prototype.registerAgent = function (role, agent) {
        this.agents.set(role, agent);
    };
    CouncilService.prototype.startSession = function (topic) {
        var id = (0, uuid_1.v4)();
        var session = {
            id: id,
            topic: topic,
            status: 'active',
            round: 1,
            opinions: [],
            votes: [],
            createdAt: Date.now()
        };
        this.sessions.set(id, session);
        return session;
    };
    CouncilService.prototype.getSession = function (id) {
        return this.sessions.get(id);
    };
    CouncilService.prototype.listSessions = function () {
        return Array.from(this.sessions.values()).sort(function (a, b) { return b.createdAt - a.createdAt; });
    };
    CouncilService.prototype.submitOpinion = function (sessionId, agentId, content) {
        var session = this.sessions.get(sessionId);
        if (!session)
            throw new Error("Council Session ".concat(sessionId, " not found"));
        if (session.status !== 'active')
            throw new Error("Council Session ".concat(sessionId, " is concluded"));
        session.opinions.push({
            agentId: agentId,
            content: content,
            timestamp: Date.now(),
            round: session.round
        });
    };
    CouncilService.prototype.advanceRound = function (sessionId) {
        var session = this.sessions.get(sessionId);
        if (!session)
            throw new Error("Council Session ".concat(sessionId, " not found"));
        session.round++;
    };
    CouncilService.prototype.castVote = function (sessionId, agentId, choice, reason) {
        var session = this.sessions.get(sessionId);
        if (!session)
            throw new Error("Council Session ".concat(sessionId, " not found"));
        if (session.status !== 'active')
            throw new Error("Council Session ".concat(sessionId, " is concluded"));
        session.votes.push({
            agentId: agentId,
            choice: choice,
            reason: reason,
            timestamp: Date.now()
        });
    };
    CouncilService.prototype.concludeSession = function (sessionId) {
        var session = this.sessions.get(sessionId);
        if (!session)
            throw new Error("Council Session ".concat(sessionId, " not found"));
        session.status = 'concluded';
    };
    return CouncilService;
}());
exports.CouncilService = CouncilService;
