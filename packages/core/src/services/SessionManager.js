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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var SessionManager = /** @class */ (function () {
    function SessionManager(baseDir) {
        if (baseDir === void 0) { baseDir = process.cwd(); }
        this.saveInterval = null;
        this.persistencePath = path_1.default.join(baseDir, '.borg-session.json');
        this.state = {
            isAutoDriveActive: false,
            activeGoal: null,
            lastObjective: null,
            lastHeartbeat: Date.now()
        };
        this.load();
        this.startAutoSave();
    }
    SessionManager.prototype.load = function () {
        try {
            if (fs_1.default.existsSync(this.persistencePath)) {
                var data = fs_1.default.readFileSync(this.persistencePath, 'utf-8');
                this.state = JSON.parse(data);
                console.log("[SessionManager] Loaded session state from ".concat(this.persistencePath));
            }
        }
        catch (e) {
            console.error("[SessionManager] Failed to load session:", e);
        }
    };
    SessionManager.prototype.save = function () {
        try {
            fs_1.default.writeFileSync(this.persistencePath, JSON.stringify(this.state, null, 2));
        }
        catch (e) {
            console.error("[SessionManager] Failed to save session:", e);
        }
    };
    SessionManager.prototype.startAutoSave = function () {
        var _this = this;
        this.saveInterval = setInterval(function () {
            _this.save();
        }, 5000); // Save every 5s
    };
    SessionManager.prototype.getState = function () {
        return __assign({}, this.state);
    };
    SessionManager.prototype.updateState = function (updates) {
        this.state = __assign(__assign(__assign({}, this.state), updates), { lastHeartbeat: Date.now() });
    };
    SessionManager.prototype.clearSession = function () {
        this.state = {
            isAutoDriveActive: false,
            activeGoal: null,
            lastObjective: null,
            lastHeartbeat: Date.now()
        };
        this.save();
    };
    SessionManager.prototype.touch = function () {
        this.state.lastHeartbeat = Date.now();
    };
    return SessionManager;
}());
exports.SessionManager = SessionManager;
