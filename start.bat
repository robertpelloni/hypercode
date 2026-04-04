@echo off
echo Starting HyperCode...

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm could not be found. Installing...
    call npm install -g pnpm
)

set RUNTIME_MODE=%HYPERCODE_RUNTIME%
if "%RUNTIME_MODE%"=="" set RUNTIME_MODE=auto

set SKIP_INSTALL=0
if /I "%HYPERCODE_SKIP_INSTALL%"=="1" set SKIP_INSTALL=1

if "%SKIP_INSTALL%"=="1" (
    echo Skipping dependency install ^(HYPERCODE_SKIP_INSTALL=1^)...
) else (
    set STARTUP_INSTALL_PROFILE=workspace
    if /I "%RUNTIME_MODE%"=="auto" set STARTUP_INSTALL_PROFILE=go-primary
    if /I "%RUNTIME_MODE%"=="go" set STARTUP_INSTALL_PROFILE=go-primary

    set INSTALL_REQUIRED=1
    if /I "%STARTUP_INSTALL_PROFILE%"=="go-primary" if /I not "%HYPERCODE_FORCE_INSTALL%"=="1" (
        echo Checking whether Go-primary startup dependencies are already ready...
        call node scripts\check_startup_install.mjs --profile=go-primary
        set INSTALL_CHECK_EXIT=%ERRORLEVEL%
        if "%INSTALL_CHECK_EXIT%"=="0" (
            set INSTALL_REQUIRED=0
            echo Skipping pnpm install because Go-primary startup dependencies are already present.
        )
    )

    if "%INSTALL_REQUIRED%"=="1" (
        echo Installing dependencies...
        call pnpm install
        if errorlevel 1 exit /b 1
    )
)

set SKIP_NATIVE_PREFLIGHT=0
if /I "%HYPERCODE_SKIP_NATIVE_PREFLIGHT%"=="1" set SKIP_NATIVE_PREFLIGHT=1

if "%SKIP_NATIVE_PREFLIGHT%"=="1" (
    echo Skipping native runtime preflight ^(HYPERCODE_SKIP_NATIVE_PREFLIGHT=1^)...
) else (
    echo Checking native runtime prerequisites...
    call node scripts\ensure_native_runtime.mjs
    if errorlevel 1 exit /b 1
)

set BUILD_TARGET=build:startup-go
if /I "%RUNTIME_MODE%"=="node" set BUILD_TARGET=build:workspace
if /I "%HYPERCODE_FULL_BUILD%"=="1" set BUILD_TARGET=build
set SKIP_BUILD=0
if /I "%HYPERCODE_SKIP_BUILD%"=="1" set SKIP_BUILD=1

if "%SKIP_BUILD%"=="1" (
    echo Skipping build step ^(HYPERCODE_SKIP_BUILD=1^)...
) else (
    if /I "%BUILD_TARGET%"=="build:startup-go" (
        echo Go-primary startup build selected for runtime mode %RUNTIME_MODE%.
        echo Set HYPERCODE_RUNTIME=node or HYPERCODE_FULL_BUILD=1 when you need full TS compatibility surfaces built before launch.
    )
    echo Building ^(%BUILD_TARGET%^)...
    call pnpm run %BUILD_TARGET%
    if errorlevel 1 exit /b 1
)

echo Starting Hub...
echo Maestro is now launched separately. Use "pnpm -C apps/maestro start" when needed.
pnpm start
exit /b %errorlevel%
