@echo off
setlocal EnableDelayedExpansion
echo Starting HyperCode...

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm could not be found. Installing...
    call npm install -g pnpm
)

set RUNTIME_MODE=%HYPERCODE_RUNTIME%
if "%RUNTIME_MODE%"=="" set RUNTIME_MODE=auto

echo Startup runtime preference: %RUNTIME_MODE%

set SKIP_INSTALL=0
if /I "%HYPERCODE_SKIP_INSTALL%"=="1" set SKIP_INSTALL=1
set INSTALL_DECISION=run
set INSTALL_REASON=workspace install path required
set INSTALL_COMMAND=pnpm install
set INSTALL_COMMAND_NOTE=full workspace install

if "%SKIP_INSTALL%"=="1" (
    set INSTALL_DECISION=skipped
    set INSTALL_REASON=explicit HYPERCODE_SKIP_INSTALL=1 override
    echo Skipping dependency install ^(%INSTALL_REASON%^)...
) else (
    set STARTUP_INSTALL_PROFILE=workspace
    if /I "%RUNTIME_MODE%"=="auto" set STARTUP_INSTALL_PROFILE=go-primary
    if /I "%RUNTIME_MODE%"=="go" set STARTUP_INSTALL_PROFILE=go-primary

    if /I "%STARTUP_INSTALL_PROFILE%"=="go-primary" (
        if /I "%HYPERCODE_STARTUP_INSTALL_SCRIPTS%"=="1" (
            set INSTALL_COMMAND=pnpm install
            set INSTALL_COMMAND_NOTE=full workspace install with scripts (explicit override)
        ) else (
            set INSTALL_COMMAND=pnpm install --ignore-scripts
            set INSTALL_COMMAND_NOTE=minimal workspace dependency sync without postinstall scripts
        )
    )

    set INSTALL_REQUIRED=1
    if /I "%STARTUP_INSTALL_PROFILE%"=="go-primary" if /I not "%HYPERCODE_FORCE_INSTALL%"=="1" (
        echo Checking whether Go-primary startup dependencies are already ready...
        call node scripts\check_startup_install.mjs --profile=go-primary
        set INSTALL_CHECK_EXIT=!ERRORLEVEL!
        if "!INSTALL_CHECK_EXIT!"=="0" (
            set INSTALL_REQUIRED=0
            set INSTALL_DECISION=skipped
            set INSTALL_REASON=Go-primary dependencies already ready
            echo Skipping pnpm install because !INSTALL_REASON!.
        )
    )

    if /I "%HYPERCODE_FORCE_INSTALL%"=="1" (
        set INSTALL_DECISION=run
        set INSTALL_REASON=explicit HYPERCODE_FORCE_INSTALL=1 override
    )
    if /I not "%HYPERCODE_FORCE_INSTALL%"=="1" if /I "%STARTUP_INSTALL_PROFILE%"=="workspace" (
        set INSTALL_DECISION=run
        set INSTALL_REASON=workspace or Node compatibility startup path selected
    )
    if /I not "%HYPERCODE_FORCE_INSTALL%"=="1" if /I not "%STARTUP_INSTALL_PROFILE%"=="workspace" if "!INSTALL_REQUIRED!"=="1" (
        set INSTALL_DECISION=run
        set INSTALL_REASON=Go-primary dependency probe reported install required
    )

    if "!INSTALL_REQUIRED!"=="1" (
        echo Running dependency install ^(!INSTALL_REASON!; !INSTALL_COMMAND_NOTE!^)...
        call !INSTALL_COMMAND!
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
set BUILD_DECISION=run
set BUILD_REASON=workspace build path required

if "%SKIP_BUILD%"=="1" (
    set BUILD_DECISION=skipped
    set BUILD_REASON=explicit HYPERCODE_SKIP_BUILD=1 override
    echo Skipping build step ^(%BUILD_REASON%^)...
) else (
    set BUILD_REQUIRED=1
    if /I "%BUILD_TARGET%"=="build:startup-go" if /I not "%HYPERCODE_FORCE_BUILD%"=="1" (
        echo Checking whether Go-primary startup build artifacts are already current...
        call node scripts\check_startup_build.mjs --profile=go-primary
        set BUILD_CHECK_EXIT=!ERRORLEVEL!
        if "!BUILD_CHECK_EXIT!"=="0" (
            set BUILD_REQUIRED=0
            set BUILD_DECISION=skipped
            set BUILD_REASON=Go-primary build artifacts already current
            echo Skipping startup build because !BUILD_REASON!.
        )
    )

    if /I "%HYPERCODE_FORCE_BUILD%"=="1" (
        set BUILD_DECISION=run
        set BUILD_REASON=explicit HYPERCODE_FORCE_BUILD=1 override
    )
    if /I not "%HYPERCODE_FORCE_BUILD%"=="1" if /I "%BUILD_TARGET%"=="build" (
        set BUILD_DECISION=run
        set BUILD_REASON=explicit HYPERCODE_FULL_BUILD=1 requested
    )
    if /I not "%HYPERCODE_FORCE_BUILD%"=="1" if /I "%BUILD_TARGET%"=="build:workspace" (
        set BUILD_DECISION=run
        set BUILD_REASON=workspace or Node compatibility startup path selected
    )
    if /I not "%HYPERCODE_FORCE_BUILD%"=="1" if /I not "%BUILD_TARGET%"=="build" if /I not "%BUILD_TARGET%"=="build:workspace" if "!BUILD_REQUIRED!"=="1" (
        set BUILD_DECISION=run
        set BUILD_REASON=Go-primary artifact probe reported build required
    )

    if "!BUILD_REQUIRED!"=="1" (
        if /I "%BUILD_TARGET%"=="build:startup-go" (
            echo Go-primary startup build selected for runtime mode %RUNTIME_MODE%.
            echo Set HYPERCODE_RUNTIME=node or HYPERCODE_FULL_BUILD=1 when you need full TS compatibility surfaces built before launch.
        )
        echo Building ^(%BUILD_TARGET%^; !BUILD_REASON!^)...
        call pnpm run %BUILD_TARGET%
        if errorlevel 1 exit /b 1
    )
)

if /I "%INSTALL_DECISION%"=="skipped" (
    echo Install phase summary: skipped ^(%INSTALL_REASON%^)
) else (
    echo Install phase summary: ran ^(%INSTALL_REASON%^)
)
if /I "%BUILD_DECISION%"=="skipped" (
    echo Build phase summary: skipped ^(%BUILD_REASON%^)
) else (
    echo Build phase summary: ran ^(%BUILD_REASON%^)
)

set HYPERCODE_STARTUP_INSTALL_DECISION=%INSTALL_DECISION%
set HYPERCODE_STARTUP_INSTALL_REASON=%INSTALL_REASON%
set HYPERCODE_STARTUP_BUILD_DECISION=%BUILD_DECISION%
set HYPERCODE_STARTUP_BUILD_REASON=%BUILD_REASON%

echo Starting Hub...
echo Maestro is now launched separately. Use "pnpm -C hypercode/research/maestro start" when needed.

set CLI_ENTRY=hypercode\packages\ts\cli\dist\cli\src\index.js
if exist "%CLI_ENTRY%" (
    echo Launching HyperCode via built CLI entrypoint ^(%CLI_ENTRY%^)...
    node "%CLI_ENTRY%" start %*
    exit /b %errorlevel%
)

echo Built CLI entrypoint was not found; falling back to pnpm start.
pnpm start -- %*
exit /b %errorlevel%
