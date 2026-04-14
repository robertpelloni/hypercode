
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class InputTools {
    async sendKeys(keys: string, forceFocus: boolean = false, targetWindow?: string): Promise<string> {
        console.error(`[InputTools] ⌨️ Sending keys: ${keys} (Focus: ${forceFocus}, Target: ${targetWindow || 'active'})`);

        // 1. Try Direct Injection (The "God Mode" Fix)
        // 1. Try Direct Injection (The "God Mode" Fix)
        // [REMOVED] ProcessRegistry not available yet.
        // try {
        //     // @ts-ignore
        //     const { ProcessRegistry } = await import("../os/ProcessRegistry.js");
        //     ...
        // } catch (e) { ... }

        // 2. Fallback to VBScript (if no active process or injection failed)
        console.error(`[InputTools] 📺 Fallback to VBScript...`);

        // Map keys to VBScript SendKeys format
        const vbMap: Record<string, string> = {
            'ctrl+r': '^r',
            'f5': '{F5}',
            'enter': '{ENTER}',
            'esc': '{ESC}',
            'control+enter': '^{ENTER}',
            'ctrl+enter': '^{ENTER}',
            'shift+enter': '+{ENTER}',
            'alt+enter': '%{ENTER}',
            'y': 'y'
        };

        const command = vbMap[keys.toLowerCase()] || keys;

        // Create VBScript file
        let focusLogic = "";

        // If targetWindow is specified, use it for focused targeting
        if (targetWindow) {
            focusLogic = `
On Error Resume Next
Set WshShell = WScript.CreateObject("WScript.Shell")
result = WshShell.AppActivate("${targetWindow}")
If Not result Then
    ' Try alternate window titles
    result = WshShell.AppActivate("${targetWindow} - Insiders")
End If
If result Then
    WScript.Sleep 150
End If
On Error GoTo 0
`;
        } else if (forceFocus) {
            focusLogic = `
' Try to focus commonly used windows
On Error Resume Next
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.AppActivate "Code - Insiders"
WshShell.AppActivate "Visual Studio Code"
WshShell.AppActivate "Code"
WshShell.AppActivate "hypercode"
WshShell.AppActivate "Terminal"
On Error GoTo 0
`;
        }

        const vbsContent = `
Set WshShell = WScript.CreateObject("WScript.Shell")
On Error Resume Next
${focusLogic}
WScript.Sleep 100
WshShell.SendKeys "${command}"
If Err.Number <> 0 Then
WScript.Echo "Error: " & Err.Description
WScript.Quit 1
End If
On Error GoTo 0
`;

        const tempFile = path.join(os.tmpdir(), `borg_input_${Date.now()}.vbs`);
        fs.writeFileSync(tempFile, vbsContent);

        return new Promise((resolve, reject) => {
            // Use wscript (GUI) + windowsHide: true to prevent focus stealing console
            const child = spawn('wscript', ['//Nologo', tempFile], {
                stdio: 'ignore',
                windowsHide: true,
                detached: false
            });

            child.on('close', (code) => {
                try { fs.unlinkSync(tempFile); } catch (e) { }
                if (code === 0) resolve(`Sent keys: ${keys} `);
                else reject(new Error(`wscript exited with code ${code} `));
            });

            child.on('error', (err) => {
                try { fs.unlinkSync(tempFile); } catch (e) { }
                reject(err);
            });
        });
    }
}
