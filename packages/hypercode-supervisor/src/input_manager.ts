import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class InputManager {
    async sendKeys(keys: string, windowTitle?: string) {
        // Map common keys to SendKeys format
        const keyMap: Record<string, string> = {
            'ctrl+r': '^{r}',
            'f5': '{F5}',
            'enter': '{ENTER}',
            'esc': '{ESC}',
            'control+enter': '^{ENTER}',
            'ctrl+enter': '^{ENTER}',
            'shift+enter': '+{ENTER}',
            'alt+enter': '%{ENTER}'
        };

        const command = keyMap[keys.toLowerCase()] || keys;

        // Safety: If windowTitle is provided, try to focus it first.
        // If focusing fails, we should probably abort to avoid typing into random windows.
        let psCommand = `$wshell = New-Object -ComObject wscript.shell;`;

        if (windowTitle) {
            psCommand += `
            $app = $wshell.AppActivate('${windowTitle}');
            if ($app) {
                Start-Sleep -Milliseconds 100;
                $wshell.SendKeys('${command}')
            } else {
                Write-Output "Failed to focus window: ${windowTitle}"
                exit 1
            }
            `;
        } else {
            // Fallback (Riskier, but supports legacy usage)
            psCommand += `$wshell.SendKeys('${command}')`;
        }

        try {
            const { stdout, stderr } = await execAsync(`powershell -Command "${psCommand}"`);
            if (stderr) throw new Error(stderr);
            return `Successfully sent keys: ${keys} ${windowTitle ? `to '${windowTitle}'` : '(Active Window)'}`;
        } catch (error: any) {
            return `Error sending keys: ${error.message}`;
        }
    }
}
