@echo off
echo Starting Borg...

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
call pnpm start
if errorlevel 1 exit /b 1
