# Deployment Instructions

## Render Deployment

Jules Autopilot is primarily deployed to Render using a Go-first architecture.

### Environment Setup
When setting up a new service on Render, configure the following:

1.  **Build Command:**
    ```bash
    pnpm install && pnpm run build && cd backend-go && go build -o jules-backend main.go
    ```
2.  **Start Command:**
    ```bash
    cd backend-go && ./jules-backend
    ```

### Required Environment Variables

Ensure these environment variables are set in your Render dashboard:

-   `NODE_VERSION`: `20.20.2` (Required for building Vite SPA)
-   `BUN_VERSION`: `1.3.4` (Currently legacy fallback but recommended for consistency)
-   `GO_VERSION`: `1.26.0` (Ensure this matches the `go.mod` file)
-   `CGO_ENABLED`: `1` (Required by the wazero runtime and SQLite driver)
-   `JULES_API_KEY`: Your master API key for orchestration.

### Troubleshooting Deploys

1.  **Go Version Mismatches:**
    If Render complains about `go.mod requires go >= x.y.z`, ensure that `backend-go/go.mod` specifies exactly the Go version available in Render's environment (currently `1.26.0`), or use `render.yaml` to pin the `go` version explicitly.

2.  **Frontend Build Failures:**
    The React UI requires Node 20.x to compile correctly. If `pnpm run build` fails, verify that `NODE_VERSION` is explicitly set in Render.

3.  **Out of Memory (OOM):**
    The frontend build step (`vite build`) can be memory intensive. On Free or Starter tiers, Vite may OOM. If this happens, configure `NODE_OPTIONS=--max-old-space-size=4096`.
