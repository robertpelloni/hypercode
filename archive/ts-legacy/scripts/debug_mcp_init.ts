
import { MCPServer } from '../packages/core/src/MCPServer.js';

console.log("Starting Debug Init...");
try {
    const server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });
    console.log("Server created successfully!");
    if (server.workflowEngine) {
        console.log("WorkflowEngine is defined.");
    } else {
        console.log("WorkflowEngine is UNDEFINED.");
    }
} catch (e) {
    console.error("Error during init:", e);
}
