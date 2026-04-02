import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Installer } from './installer.js';
import { ProcessManager } from './process_manager.js';
import { InputManager } from './input_manager.js';
import { UiAutomationManager } from './ui_automation.js';

import { logger } from './logger.js';

class SupervisorServer {
    private server: Server;
    private processManager: ProcessManager;
    private inputManager: InputManager;
    private uiAutomationManager: UiAutomationManager;

    constructor() {
        this.processManager = new ProcessManager();
        this.inputManager = new InputManager();
        this.uiAutomationManager = new UiAutomationManager();
        this.server = new Server(
            {
                name: "hypercode-supervisor",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "install_supervisor",
                        description: "Install HyperCode Supervisor into Antigravity MCP Config",
                        inputSchema: {
                            type: "object",
                            properties: {
                                configPath: {
                                    type: "string",
                                    description: "Abs path to mcp.json"
                                }
                            }
                        }
                    },
                    {
                        name: "list_processes",
                        description: "List active system processes",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "kill_process",
                        description: "Kill a process by PID",
                        inputSchema: {
                            type: "object",
                            properties: {
                                pid: { type: "number", description: "Process ID" }
                            },
                            required: ["pid"]
                        }
                    },
                    {
                        name: "simulate_input",
                        description: "Send keyboard input (PowerShell SendKeys)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                keys: {
                                    type: "string",
                                    description: "Keys to send (e.g. 'ctrl+r', 'f5')"
                                },
                                windowTitle: {
                                    type: "string",
                                    description: "Exact window title to focus before sending keys (Recommended)"
                                }
                            },
                            required: ["keys"]
                        }
                    },
                    {
                        name: "detect_chat_surface",
                        description: "Inspect the active window and classify the current chat surface heuristically",
                        inputSchema: {
                            type: "object",
                            properties: {}
                        }
                    },
                    {
                        name: "inspect_window_ui",
                        description: "List visible button-like controls and text inputs from the active or matching window",
                        inputSchema: {
                            type: "object",
                            properties: {
                                windowTitle: {
                                    type: "string",
                                    description: "Optional partial window title to target"
                                },
                                processName: {
                                    type: "string",
                                    description: "Optional process name to target (e.g. chrome, firefox)"
                                }
                            }
                        }
                    },
                    {
                        name: "detect_chat_state",
                        description: "Heuristically detect whether the current chat is waiting on action buttons or ready for bump text",
                        inputSchema: {
                            type: "object",
                            properties: {
                                windowTitle: {
                                    type: "string",
                                    description: "Optional partial window title to target"
                                },
                                processName: {
                                    type: "string",
                                    description: "Optional process name to target"
                                }
                            }
                        }
                    },
                    {
                        name: "click_action_buttons",
                        description: "Find real button-like UI elements by label and click them without treating comboboxes as buttons",
                        inputSchema: {
                            type: "object",
                            properties: {
                                labels: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Labels to click. Defaults to Run/Expand/Allow/Accept style actions."
                                },
                                windowTitle: {
                                    type: "string",
                                    description: "Optional partial window title to target"
                                },
                                processName: {
                                    type: "string",
                                    description: "Optional process name to target"
                                }
                            }
                        }
                    },
                    {
                        name: "set_chat_input",
                        description: "Find the active chat composer, replace its content, and type bump text",
                        inputSchema: {
                            type: "object",
                            properties: {
                                text: {
                                    type: "string",
                                    description: "Text to place in the detected chat input"
                                },
                                clearExisting: {
                                    type: "boolean",
                                    description: "Whether to replace existing composer text",
                                    default: true
                                },
                                windowTitle: {
                                    type: "string",
                                    description: "Optional partial window title to target"
                                },
                                processName: {
                                    type: "string",
                                    description: "Optional process name to target"
                                }
                            },
                            required: ["text"]
                        }
                    },
                    {
                        name: "submit_chat_input",
                        description: "Submit the current chat composer with a configurable key chord such as alt+enter",
                        inputSchema: {
                            type: "object",
                            properties: {
                                keyChord: {
                                    type: "string",
                                    description: "Submission key chord",
                                    default: "alt+enter"
                                },
                                windowTitle: {
                                    type: "string",
                                    description: "Optional partial window title to target"
                                },
                                processName: {
                                    type: "string",
                                    description: "Optional process name to target"
                                }
                            }
                        }
                    },
                    {
                        name: "advance_chat",
                        description: "Single-step autopilot helper: click pending action buttons, otherwise type and optionally submit bump text",
                        inputSchema: {
                            type: "object",
                            properties: {
                                bumpText: {
                                    type: "string",
                                    description: "Optional bump text to type when the chat is ready for input"
                                },
                                actionLabels: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Optional button labels to click"
                                },
                                submitAfterTyping: {
                                    type: "boolean",
                                    description: "Whether to submit after typing bump text",
                                    default: true
                                },
                                submitKeyChord: {
                                    type: "string",
                                    description: "Key chord used to submit typed bump text",
                                    default: "alt+enter"
                                },
                                windowTitle: {
                                    type: "string",
                                    description: "Optional partial window title to target"
                                },
                                processName: {
                                    type: "string",
                                    description: "Optional process name to target"
                                }
                            }
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            logger.info(`Executing tool: ${request.params.name}`, request.params.arguments);

            try {
                if (request.params.name === "install_supervisor") {
                    const configPath = request.params.arguments?.configPath as string | undefined;
                    const installer = new Installer(configPath);
                    const result = await installer.install();
                    logger.info("Install Result", { result });
                    return {
                        content: [{ type: "text", text: result }]
                    };
                }

                if (request.params.name === "list_processes") {
                    const processes = await this.processManager.listProcesses();
                    return {
                        content: [{ type: "text", text: JSON.stringify(processes, null, 2) }]
                    };
                }

                if (request.params.name === "kill_process") {
                    const pid = request.params.arguments?.pid as number;
                    const result = await this.processManager.killProcess(pid);
                    logger.warn("Process Killed", { pid, result });
                    return {
                        content: [{ type: "text", text: result }]
                    };
                }

                if (request.params.name === "simulate_input") {
                    const keys = request.params.arguments?.keys as string;
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const result = await this.inputManager.sendKeys(keys, windowTitle);
                    logger.info("Input Simulated", { keys, result });
                    return {
                        content: [{ type: "text", text: result }]
                    };
                }

                if (request.params.name === "detect_chat_surface") {
                    const result = await this.uiAutomationManager.detectChatSurface();
                    logger.info("Chat Surface Detected", result);
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                if (request.params.name === "inspect_window_ui") {
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const processName = request.params.arguments?.processName as string | undefined;
                    const result = await this.uiAutomationManager.inspectWindow(windowTitle, processName);
                    logger.info("Window UI Inspected", { windowTitle, processName });
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                if (request.params.name === "detect_chat_state") {
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const processName = request.params.arguments?.processName as string | undefined;
                    const result = await this.uiAutomationManager.detectChatState(windowTitle, processName);
                    logger.info("Chat State Detected", { windowTitle, processName, state: result.state });
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                if (request.params.name === "click_action_buttons") {
                    const labels = (request.params.arguments?.labels as string[] | undefined) ?? undefined;
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const processName = request.params.arguments?.processName as string | undefined;
                    const result = await this.uiAutomationManager.clickActionButtons(labels, windowTitle, processName);
                    logger.info("Action Buttons Clicked", { labels, windowTitle, processName, clicked: result.clicked.map((item) => item.name) });
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                if (request.params.name === "set_chat_input") {
                    const text = request.params.arguments?.text as string;
                    const clearExisting = request.params.arguments?.clearExisting as boolean | undefined;
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const processName = request.params.arguments?.processName as string | undefined;
                    const result = await this.uiAutomationManager.setChatInput(text, { clearExisting, windowTitle, processName });
                    logger.info("Chat Input Set", { textLength: text.length, clearExisting, windowTitle, processName, method: result.method });
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                if (request.params.name === "submit_chat_input") {
                    const keyChord = request.params.arguments?.keyChord as string | undefined;
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const processName = request.params.arguments?.processName as string | undefined;
                    const result = await this.uiAutomationManager.submitChatInput(keyChord, windowTitle, processName);
                    logger.info("Chat Input Submitted", { keyChord, windowTitle, processName });
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                if (request.params.name === "advance_chat") {
                    const bumpText = request.params.arguments?.bumpText as string | undefined;
                    const actionLabels = request.params.arguments?.actionLabels as string[] | undefined;
                    const submitAfterTyping = request.params.arguments?.submitAfterTyping as boolean | undefined;
                    const submitKeyChord = request.params.arguments?.submitKeyChord as string | undefined;
                    const windowTitle = request.params.arguments?.windowTitle as string | undefined;
                    const processName = request.params.arguments?.processName as string | undefined;
                    const result = await this.uiAutomationManager.advanceChat({
                        bumpText,
                        actionLabels,
                        submitAfterTyping,
                        submitKeyChord,
                        windowTitle,
                        processName
                    });
                    logger.info("Advance Chat Completed", { detail: result.detail });
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                    };
                }

                throw new Error(`Tool ${request.params.name} not found`);
            } catch (err: any) {
                logger.error(`Tool Execution Failed: ${request.params.name}`, { error: err.message });
                throw err;
            }
        });
    }

    async start() {
        logger.info("HyperCode Supervisor Starting...");
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.info("HyperCode Supervisor Connected to Stdio");
    }
}

const server = new SupervisorServer();
server.start().catch((err: any) => logger.error("Fatal Error", err));
