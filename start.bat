@echo off
echo Starting Borg...

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo pnpm could not be found. Installing...
    npm install -g pnpm
)

set SKIP_INSTALL=0
if /I "%BORG_SKIP_INSTALL%"=="1" set SKIP_INSTALL=1

if "%SKIP_INSTALL%"=="1" (
    echo Skipping dependency install (BORG_SKIP_INSTALL=1)...
) else (
    echo Installing dependencies...
    call pnpm install
    if %errorlevel% neq 0 exit /b %errorlevel%
)

set BUILD_TARGET=build:workspace
if /I "%BORG_FULL_BUILD%"=="1" set BUILD_TARGET=build

echo Building (%BUILD_TARGET%)...
call pnpm run %BUILD_TARGET%
if %errorlevel% neq 0 exit /b %errorlevel%

echo Starting Hub...
call pnpm start
if %errorlevel% neq 0 exit /b %errorlevel%
