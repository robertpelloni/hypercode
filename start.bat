@echo off
setlocal EnableDelayedExpansion
echo Starting HyperCode 1.0.0-alpha.32 (Go Native Core)...

cd go
where go >nul 2>nul
if errorlevel 1 (
    echo Go could not be found. Please install Go 1.22+.
    exit /b 1
)

set VER=1.0.0-alpha.32
echo Building HyperCode Go Control Plane...
go build -ldflags "-X internal/buildinfo.Version=%VER%" -buildvcs=false -o ../bin/hypercode.exe ./cmd/hypercode
if errorlevel 1 (
    echo Go build failed.
    exit /b 1
)

cd ..
echo Launching HyperCode...
bin\hypercode.exe %*
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
    echo Checking native runtime prerequisites...
    call node scripts\ensure_native_runtime.mjs
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
