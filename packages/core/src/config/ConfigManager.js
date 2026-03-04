"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var ConfigManager = /** @class */ (function () {
    function ConfigManager() {
        // Use user home or workspace root? 
        // MCPServer uses process.cwd()/.borg/skills
        // Let's use process.cwd()/.borg/config.json
        this.configPath = path_1.default.join(process.cwd(), '.borg', 'config.json');
    }
    ConfigManager.prototype.loadConfig = function () {
        try {
            if (fs_1.default.existsSync(this.configPath)) {
                var content = fs_1.default.readFileSync(this.configPath, 'utf-8');
                var parsed = JSON.parse(content);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
        }
        catch (e) {
            console.error("[ConfigManager] Failed to load config:", e);
        }
        return null;
    };
    ConfigManager.prototype.saveConfig = function (config) {
        try {
            var dir = path_1.default.dirname(this.configPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            console.log("[ConfigManager] Saved config to", this.configPath);
        }
        catch (e) {
            console.error("[ConfigManager] Failed to save config:", e);
        }
    };
    return ConfigManager;
}());
exports.ConfigManager = ConfigManager;
