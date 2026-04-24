import * as vscode from 'vscode';
import {
    DaemonClient,
    DaemonEvent,
    DaemonStatusPayload,
    LogAddedPayload,
    ShadowPilotAlertPayload
} from './daemon-client';

let client: DaemonClient;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

// Track state for status bar rendering
let daemonConnected = false;
let activeSessionCount = 0;
let keeperPaused = false;

export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('Jules Autopilot');
    outputChannel.appendLine('[Jules] Extension activated.');

    // Status bar — priority 100 puts it on the left side
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'jules.viewLogs';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Initialize WebSocket client
    const config = vscode.workspace.getConfiguration('jules');
    const daemonUrl = config.get<string>('daemonUrl', 'ws://localhost:8080/ws');
    client = new DaemonClient(daemonUrl);

    // Wire event handlers
    const eventDisposable = client.onEvent((event: DaemonEvent) => {
        switch (event.type) {
            case 'connected':
                daemonConnected = true;
                outputChannel.appendLine('[Jules] Connected to daemon.');
                updateStatusBar();
                break;

            case 'daemon_status': {
                const status = event.data as DaemonStatusPayload;
                activeSessionCount = status.sessionCount;
                keeperPaused = status.status === 'stopped';
                updateStatusBar();
                break;
            }

            case 'log_added': {
                const log = (event.data as LogAddedPayload).log;
                outputChannel.appendLine(
                    `[${log.type.toUpperCase()}] [${log.sessionId.slice(0, 8)}] ${log.message}`
                );
                break;
            }

            case 'session_nudged':
                outputChannel.appendLine(`[NUDGE] Session nudged: ${JSON.stringify(event.data)}`);
                break;

            case 'shadow_pilot_alert': {
                const alert = event.data as ShadowPilotAlertPayload;
                const severity = alert.severity;
                const msg = `🛡️ Shadow Pilot: ${alert.message}`;
                if (severity === 'critical') {
                    vscode.window.showErrorMessage(msg);
                } else if (severity === 'warning') {
                    vscode.window.showWarningMessage(msg);
                } else {
                    vscode.window.showInformationMessage(msg);
                }
                outputChannel.appendLine(`[SHADOW] ${alert.severity}: ${alert.message}`);
                if (alert.diffSnippet) {
                    outputChannel.appendLine(alert.diffSnippet);
                }
                break;
            }

            case 'sessions_list_updated':
                outputChannel.appendLine('[Jules] Sessions list updated.');
                break;

            default:
                break;
        }
    });
    context.subscriptions.push(eventDisposable);

    // Connect
    client.connect();

    // Handle disconnection detection via a polling check
    const connectionPoller = setInterval(() => {
        if (!client.isConnected && daemonConnected) {
            daemonConnected = false;
            activeSessionCount = 0;
            updateStatusBar();
            outputChannel.appendLine('[Jules] Disconnected from daemon. Reconnecting...');
        }
    }, 5000);
    context.subscriptions.push(new vscode.Disposable(() => clearInterval(connectionPoller)));

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('jules.startSession', commandStartSession),
        vscode.commands.registerCommand('jules.pauseKeeper', commandPauseKeeper),
        vscode.commands.registerCommand('jules.resumeKeeper', commandResumeKeeper),
        vscode.commands.registerCommand('jules.viewLogs', commandViewLogs)
    );

    outputChannel.appendLine(`[Jules] Connecting to daemon at ${daemonUrl}...`);
}

export function deactivate(): void {
    client?.disconnect();
    outputChannel?.appendLine('[Jules] Extension deactivated.');
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------
function updateStatusBar(): void {
    if (!daemonConnected) {
        statusBarItem.text = '$(debug-disconnect) Jules: Offline';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        statusBarItem.tooltip = 'Jules Autopilot — Not connected to daemon';
        return;
    }

    if (keeperPaused) {
        statusBarItem.text = `$(debug-pause) Jules: Paused`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = 'Jules Autopilot — Keeper is paused';
        return;
    }

    statusBarItem.text = `$(pulse) Jules: ${activeSessionCount} session${activeSessionCount !== 1 ? 's' : ''}`;
    statusBarItem.backgroundColor = undefined; // Default (green-ish in most themes)
    statusBarItem.tooltip = `Jules Autopilot — ${activeSessionCount} active session(s)`;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function commandStartSession(): Promise<void> {
    if (!client.isConnected) {
        vscode.window.showErrorMessage('Jules: Not connected to daemon.');
        return;
    }

    const templateName = await vscode.window.showInputBox({
        prompt: 'Enter a session prompt or template name',
        placeHolder: 'e.g., Fix the login bug in auth.ts'
    });

    if (templateName) {
        client.send({ type: 'command', action: 'start_session', prompt: templateName });
        vscode.window.showInformationMessage(`Jules: Session started — "${templateName}"`);
        outputChannel.appendLine(`[CMD] Started session: ${templateName}`);
    }
}

function commandPauseKeeper(): void {
    if (!client.isConnected) {
        vscode.window.showErrorMessage('Jules: Not connected to daemon.');
        return;
    }
    client.send({ type: 'command', action: 'pause_keeper' });
    keeperPaused = true;
    updateStatusBar();
    outputChannel.appendLine('[CMD] Keeper paused.');
    vscode.window.showInformationMessage('Jules: Keeper paused.');
}

function commandResumeKeeper(): void {
    if (!client.isConnected) {
        vscode.window.showErrorMessage('Jules: Not connected to daemon.');
        return;
    }
    client.send({ type: 'command', action: 'resume_keeper' });
    keeperPaused = false;
    updateStatusBar();
    outputChannel.appendLine('[CMD] Keeper resumed.');
    vscode.window.showInformationMessage('Jules: Keeper resumed.');
}

function commandViewLogs(): void {
    outputChannel.show(true);
}
