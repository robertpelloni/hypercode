#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './app.js';

const instance = render(<App />, {
  patchConsole: false,
  exitOnCtrlC: false,
});

process.on('SIGINT', () => {
  instance.unmount();
  process.exit(0);
});

process.on('SIGTERM', () => {
  instance.unmount();
  process.exit(0);
});

instance.waitUntilExit().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('App exited with error:', error);
  process.exit(1);
});
