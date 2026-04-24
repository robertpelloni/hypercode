
// @ts-ignore
import { EventBus } from '../packages/core/src/services/EventBus.ts';
// @ts-ignore
import { FileSensor } from '../packages/core/src/sensors/FileSensor.ts';
// @ts-ignore
import { TerminalSensor } from '../packages/core/src/sensors/TerminalSensor.ts';
import fs from 'fs/promises';
import path from 'path';

async function verify() {
    console.log("🧪 Verifying Nervous System...");

    // 1. Setup Event Bus
    const eventBus = new EventBus();
    const receivedEvents: any[] = [];

    // Subscribe to all events
    // @ts-ignore
    eventBus.subscribe('*', (event) => {
        console.log(`[EventBus] Received: ${event.type} from ${event.source}`);
        receivedEvents.push(event);
    });

    // 2. Verify File Sensor
    const testDir = path.join(process.cwd(), 'packages', 'core', 'src', 'sensors', 'test_generated');
    await fs.mkdir(testDir, { recursive: true });

    // Watch the directory itself, not just the glob, to reduce glob issues
    // @ts-ignore
    const fileSensor = new FileSensor(eventBus, process.cwd(), [testDir.split(path.sep).join('/')]);
    fileSensor.start();

    // WAIT for chokidar to initialize (polling takes time)
    console.log("Waiting 5s for FileSensor to initialize...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Trigger file creation
    const testFile = path.join(testDir, 'test_sensor.ts');
    console.log("Creating test file:", testFile);
    await fs.writeFile(testFile, '// test');

    // Wait for event (polling latency)
    console.log("Waiting 10s for filesystem events...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Cleanup file
    await fs.rm(testDir, { recursive: true, force: true });
    fileSensor.stop();

    // 3. Verify Terminal Sensor
    const termSensor = new TerminalSensor(eventBus);
    termSensor.start();

    console.error("❌ This is a SIMULATED ERROR for testing TerminalSensor");

    termSensor.stop();

    // 4. Assertions
    console.log("\n--- Verification Report ---");
    const hasFileEvent = receivedEvents.some(e => e.type === 'file:create' || e.type === 'file:change');
    const hasTermEvent = receivedEvents.some(e => e.type === 'terminal:error');

    if (hasFileEvent) console.log("✅ FileSensor: Detected file creation/change.");
    else console.error("❌ FileSensor: No file events detected.");

    if (hasTermEvent) console.log("✅ TerminalSensor: Detected error log.");
    else console.error("❌ TerminalSensor: No error events detected.");

    if (hasFileEvent && hasTermEvent) {
        console.log("✅ Nervous System Operational.");
    } else {
        console.error("❌ Nervous System Failure.");
        process.exit(1);
    }
}

verify().catch(console.error);
