"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Marker file creation to prove code execution
var fs_1 = require("fs");
var path_1 = require("path");
try {
    fs_1.default.writeFileSync(path_1.default.join(process.cwd(), '.hypercode_startup_marker'), "Started at ".concat(new Date().toISOString()));
}
catch (e) { }
