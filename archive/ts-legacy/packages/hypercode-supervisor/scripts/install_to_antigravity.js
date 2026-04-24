import { Installer } from '../dist/installer.js';

async function install() {
<<<<<<<< HEAD:archive/ts-legacy/packages/hypercode-supervisor/scripts/install_to_antigravity.js
    console.log("Installing HyperCode Supervisor to Antigravity...");
========
    console.log("Installing borg Supervisor to Antigravity...");
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/borg-supervisor/scripts/install_to_antigravity.js
    // Default path is already set in Installer class to:
    // C:\Users\hyper\AppData\Roaming\Antigravity\User\mcp.json
    const installer = new Installer();

    try {
        const result = await installer.install();
        console.log(result);
    } catch (err) {
        console.error("Installation failed:", err);
        process.exit(1);
    }
}

install();
