"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execAsync = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
exports.execAsync = (0, util_1.promisify)(child_process_1.exec);
