import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        background: 'src/background.ts',
        content: 'src/content.ts',
        popup: 'src/popup.ts',
    },
    format: ['iife'],
    outDir: 'dist',
    clean: false,
    noExternal: [/(.*)/], // Bundle everything for the browser
    platform: 'browser',
    target: 'es2022',
    splitting: false,
    treeshake: true,
    outExtension() {
        return {
            js: `.js`,
        };
    },
});
