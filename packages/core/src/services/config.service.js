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
exports.configService = void 0;
var index_js_1 = require("../types/metamcp/index.js");
var index_js_2 = require("../db/repositories/index.js");
exports.configService = {
    isSignupDisabled: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.DISABLE_SIGNUP)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config === "true"];
                }
            });
        });
    },
    setSignupDisabled: function (disabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.DISABLE_SIGNUP, disabled.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    isSsoSignupDisabled: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.DISABLE_SSO_SIGNUP)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config === "true"];
                }
            });
        });
    },
    setSsoSignupDisabled: function (disabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.DISABLE_SSO_SIGNUP, disabled.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    isBasicAuthDisabled: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.DISABLE_BASIC_AUTH)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config === "true"];
                }
            });
        });
    },
    setBasicAuthDisabled: function (disabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.DISABLE_BASIC_AUTH, disabled.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    getMcpResetTimeoutOnProgress: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.MCP_RESET_TIMEOUT_ON_PROGRESS)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config === "true" || true];
                }
            });
        });
    },
    setMcpResetTimeoutOnProgress: function (enabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.MCP_RESET_TIMEOUT_ON_PROGRESS, enabled.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    getMcpTimeout: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.MCP_TIMEOUT)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config ? parseInt(config, 10) : 60000];
                }
            });
        });
    },
    setMcpTimeout: function (timeout) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.MCP_TIMEOUT, timeout.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    getMcpMaxTotalTimeout: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.MCP_MAX_TOTAL_TIMEOUT)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config ? parseInt(config, 10) : 60000];
                }
            });
        });
    },
    setMcpMaxTotalTimeout: function (timeout) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.MCP_MAX_TOTAL_TIMEOUT, timeout.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    getMcpMaxAttempts: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.MCP_MAX_ATTEMPTS)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, config ? parseInt(config, 10) : 1];
                }
            });
        });
    },
    setMcpMaxAttempts: function (maxAttempts) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.MCP_MAX_ATTEMPTS, maxAttempts.toString())];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    getSessionLifetime: function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, lifetime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(index_js_1.ConfigKeyEnum.Enum.SESSION_LIFETIME)];
                    case 1:
                        config = _a.sent();
                        if (!config) {
                            return [2 /*return*/, null]; // No session lifetime set - infinite sessions
                        }
                        lifetime = parseInt(config, 10);
                        return [2 /*return*/, isNaN(lifetime) ? null : lifetime];
                }
            });
        });
    },
    setSessionLifetime: function (lifetime) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(lifetime === null || lifetime === undefined)) return [3 /*break*/, 2];
                        // Remove the config to indicate infinite session lifetime
                        return [4 /*yield*/, index_js_2.configRepo.delete(index_js_1.ConfigKeyEnum.Enum.SESSION_LIFETIME)];
                    case 1:
                        // Remove the config to indicate infinite session lifetime
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, index_js_2.configRepo.set(index_js_1.ConfigKeyEnum.Enum.SESSION_LIFETIME, lifetime.toString())];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    getConfig: function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.get(key)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    setConfig: function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_2.configRepo.set(key, value)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // async getAllConfigs(): Promise<
    //   Array<{ id: string; value: string; description?: string | null }>
    // > {
    //   return await configRepo.getAllConfigs(); // Need to implement getAll in repo or allow it. Repo didn't have getAll in my previous view.
    // },
    getAuthProviders: function () {
        return __awaiter(this, void 0, void 0, function () {
            var providers, isOidcEnabled;
            return __generator(this, function (_a) {
                providers = [];
                isOidcEnabled = !!(process.env.OIDC_CLIENT_ID &&
                    process.env.OIDC_CLIENT_SECRET &&
                    process.env.OIDC_DISCOVERY_URL);
                if (isOidcEnabled) {
                    providers.push({
                        id: "oidc",
                        name: "OIDC",
                        enabled: true,
                    });
                }
                return [2 /*return*/, providers];
            });
        });
    },
    /**
     * Get the memory limit for Code Mode execution in MB.
     * Defaults to 128MB.
     */
    getCodeExecutionMemoryLimit: function () {
        var envVal = process.env.CODE_EXECUTION_MEMORY_LIMIT;
        if (envVal) {
            var parsed = parseInt(envVal, 10);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
        return 128;
    },
    /**
     * Validate that OPENAI_API_KEY is present if required features are enabled.
     * Logs a warning if not present.
     */
    validateOpenAiKey: function () {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("WARN: OPENAI_API_KEY is not set. Semantic Search and Autonomous Agent features will not work.");
        }
    }
};
