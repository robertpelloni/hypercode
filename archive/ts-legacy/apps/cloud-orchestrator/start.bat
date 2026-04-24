@echo off
setlocal

echo [Jules Autopilot] Initializing...

:: Check for Go
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed. Please install Go 1.21+ from https://go.dev
    pause
    exit /b 1
)

:: Check for Node/pnpm
call pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is not installed. Please install it via 'npm install -g pnpm'
    pause
    exit /b 1
)

:: Always rebuild shared package if needed
if not exist "packages\shared\dist" (
    echo [INFO] Building shared types...
    call pnpm --filter @jules/shared build
)

:: Check if frontend is built
if not exist "dist" (
    echo [INFO] Frontend build not found. Building now...
    call pnpm install
    call pnpm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Go Backend...
echo [INFO] The dashboard will be available at http://localhost:8080
cd backend-go
go run main.go

pause
