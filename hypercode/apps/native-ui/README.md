# HyperCode Native UI

This directory contains the new, lightweight, native UI for HyperCode, replacing the Electron-based `apps/maestro`. 
It is built using [Wails](https://wails.io/), which uses native OS webviews (WebView2 on Windows, WebKit on macOS/Linux) and a high-performance Go backend.

## Why Wails instead of Electron?
1. **Dramatically smaller binary size** (typically < 15MB compared to Electron's 150MB+).
2. **Lower memory footprint** (uses the OS's built-in webview).
3. **Native Go Integration**: Since the core of HyperCode is moving to Go, keeping the desktop backend in Go allows direct compilation and function bindings without RPC overhead.
4. **Super fast startup times**.

## Setup
1. Install Wails: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
2. Run development mode: `wails dev`
3. Build for production: `wails build`
