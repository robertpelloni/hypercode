@echo off
setlocal EnableDelayedExpansion
echo Starting Borg 1.0.0-alpha.37 (Go Native Core)...

cd go
where go >nul 2>nul
if errorlevel 1 (
    echo Go could not be found. Please install Go 1.22+.
    exit /b 1
)

set VER=1.0.0-alpha.37
echo Building Borg Go Control Plane...
go build -ldflags "-X internal/buildinfo.Version=%VER%" -buildvcs=false -o ../bin/borg.exe ./cmd/borg
if errorlevel 1 (
    echo Go build failed.
    exit /b 1
)

cd ..
echo Launching Borg...
bin\borg.exe %*
echo Starting borg...

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm could not be found. Installing...
    call npm install -g pnpm
)

set SKIP_INSTALL=0
if /I "%BORG_SKIP_INSTALL%"=="1" set SKIP_INSTALL=1

if "%SKIP_INSTALL%"=="1" (
    echo Skipping dependency install ^(BORG_SKIP_INSTALL=1^)...
) else (
    echo Installing dependencies...
    call pnpm install
    if errorlevel 1 exit /b 1
)

set SKIP_NATIVE_PREFLIGHT=0
if /I "%BORG_SKIP_NATIVE_PREFLIGHT%"=="1" set SKIP_NATIVE_PREFLIGHT=1

if "%SKIP_NATIVE_PREFLIGHT%"=="1" (
    echo Skipping native runtime preflight ^(BORG_SKIP_NATIVE_PREFLIGHT=1^)...
) else (
    echo Rebuilding native modules for Node 24...
    call pnpm rebuild better-sqlite3
    if errorlevel 1 exit /b 1
)

set BUILD_TARGET=build:workspace
if /I "%BORG_FULL_BUILD%"=="1" set BUILD_TARGET=build
set SKIP_BUILD=0
if /I "%BORG_SKIP_BUILD%"=="1" set SKIP_BUILD=1

if "%SKIP_BUILD%"=="1" (
    echo Skipping build step ^(BORG_SKIP_BUILD=1^)...
) else (
    echo Building ^(%BUILD_TARGET%^)...
    call pnpm run %BUILD_TARGET%
    if errorlevel 1 exit /b 1
)

echo Starting Hub...
echo Maestro is now launched separately. Use "pnpm -C apps/maestro start" when needed.
pnpm start
exit /b %errorlevel%
