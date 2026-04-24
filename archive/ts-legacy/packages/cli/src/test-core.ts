console.log("DEBUG: Starting import test...");
const start = Date.now();
try {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/test-core.ts
    console.log("DEBUG: Importing @hypercode/core...");
    const core = await import('@hypercode/core');
    console.log("DEBUG: @hypercode/core loaded successfully in " + (Date.now() - start) + "ms");
    console.log("Exports:", Object.keys(core));
} catch (e) {
    console.error("DEBUG: Failed to import @hypercode/core", e);
=======
    console.log("DEBUG: Importing @borg/core...");
    const core = await import('@borg/core');
    console.log("DEBUG: @borg/core loaded successfully in " + (Date.now() - start) + "ms");
    console.log("Exports:", Object.keys(core));
} catch (e) {
    console.error("DEBUG: Failed to import @borg/core", e);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/test-core.ts
}
