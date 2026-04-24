
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/scripts/test-suggestion.ts
    console.log('Connected to HyperCode Hub');
=======
    console.log('Connected to borg Hub');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/scripts/test-suggestion.ts

    // Simulate User Editing a TS file to trigger Linter Suggestion
    const activityMsg = {
        type: 'USER_ACTIVITY',
        lastActivityTime: Date.now(),
        activeEditor: {
<<<<<<< HEAD:archive/ts-legacy/packages/core/scripts/test-suggestion.ts
            uri: 'C:\\Users\\hyper\\workspace\\hypercode\\packages\\core\\src\\index.ts'
=======
            uri: 'C:\\Users\\hyper\\workspace\\borg\\packages\\core\\src\\index.ts'
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/scripts/test-suggestion.ts
        }
    };

    ws.send(JSON.stringify(activityMsg));
    console.log('Sent Activity:', activityMsg);

    setTimeout(() => {
        ws.close();
    }, 1000);
});
