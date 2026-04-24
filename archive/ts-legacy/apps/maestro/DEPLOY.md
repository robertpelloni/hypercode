# Deployment Instructions

1. Build the frontend (React + Vite):
   ```bash
   npm run build:renderer
   ```
2. Build the Go backend (Wails v3):
   ```bash
   cd go
   go build -o ../build/maestro-core ./...
   ```
3. To package for release:
   ```bash
   npm run package
   ```
