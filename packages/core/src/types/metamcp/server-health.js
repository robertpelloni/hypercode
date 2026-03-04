"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerHealthStatusEnum = void 0;
var zod_1 = require("zod");
exports.ServerHealthStatusEnum = zod_1.z.enum([
    "HEALTHY",
    "UNHEALTHY",
    "UNKNOWN",
    "CHECKING",
]);
