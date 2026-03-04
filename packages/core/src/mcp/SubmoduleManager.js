"use strict";
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
exports.SubmoduleManager = void 0;
var child_process_1 = require("child_process");
var path_1 = require("path");
var fs_1 = require("fs");
var SubmoduleManager = /** @class */ (function () {
    function SubmoduleManager(rootDir) {
        this.submodulesDir = path_1.default.join(rootDir, 'submodules');
        if (!fs_1.default.existsSync(this.submodulesDir)) {
            fs_1.default.mkdirSync(this.submodulesDir, { recursive: true });
        }
    }
    SubmoduleManager.prototype.addSubmodule = function (name, repoUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var targetPath;
            var _this = this;
            return __generator(this, function (_a) {
                targetPath = path_1.default.join(this.submodulesDir, name);
                if (fs_1.default.existsSync(targetPath)) {
                    return [2 /*return*/, "Submodule ".concat(name, " already exists at ").concat(targetPath)];
                }
                console.log("[SubmoduleManager] Cloning ".concat(repoUrl, " to ").concat(targetPath, "..."));
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var git = (0, child_process_1.spawn)("git", ["clone", repoUrl, name], {
                            cwd: _this.submodulesDir,
                            stdio: 'inherit'
                        });
                        git.on('close', function (code) {
                            if (code === 0)
                                resolve("Successfully cloned ".concat(name));
                            else
                                reject(new Error("Git clone failed with code ".concat(code)));
                        });
                    })];
            });
        });
    };
    SubmoduleManager.prototype.updateSubmodule = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var targetPath;
            return __generator(this, function (_a) {
                targetPath = path_1.default.join(this.submodulesDir, name);
                if (!fs_1.default.existsSync(targetPath)) {
                    throw new Error("Submodule ".concat(name, " not found."));
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var git = (0, child_process_1.spawn)("git", ["pull"], {
                            cwd: targetPath,
                            stdio: 'inherit'
                        });
                        git.on('close', function (code) {
                            if (code === 0)
                                resolve("Successfully updated ".concat(name));
                            else
                                reject(new Error("Git pull failed with code ".concat(code)));
                        });
                    })];
            });
        });
    };
    SubmoduleManager.prototype.listSubmodules = function () {
        var _this = this;
        if (!fs_1.default.existsSync(this.submodulesDir))
            return [];
        return fs_1.default.readdirSync(this.submodulesDir).filter(function (f) {
            return fs_1.default.statSync(path_1.default.join(_this.submodulesDir, f)).isDirectory();
        });
    };
    return SubmoduleManager;
}());
exports.SubmoduleManager = SubmoduleManager;
