@echo off
REM ============================================================
REM  [AoG] Hub - one-click Windows build + installer
REM  Double-click it, or run:  build-hub.bat [dev ^| beta ^| prod]
REM  Default channel is prod (the release installer).
REM ============================================================
setlocal EnableDelayedExpansion
title [AoG] Hub - Build

REM Always run from the repo root (wherever this file lives).
cd /d "%~dp0"

REM --- Channel: build-hub.bat [dev|beta|prod], default prod ---
set "CHANNEL=%~1"
if "%CHANNEL%"=="" set "CHANNEL=prod"
if /i not "%CHANNEL%"=="dev" if /i not "%CHANNEL%"=="beta" if /i not "%CHANNEL%"=="prod" (
  echo Usage: build-hub.bat [dev ^| beta ^| prod]
  pause
  exit /b 1
)

REM --- 1. Make sure bun exists ---
where bun >nul 2>nul
if errorlevel 1 (
  echo [!] bun not found, trying npm fallback...
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [X] Install bun from https://bun.sh then re-run this file.
    pause
    exit /b 1
  )
  call npm i -g bun
  set "PATH=%APPDATA%\npm;%PATH%"
  where bun >nul 2>nul
  if errorlevel 1 (
    echo [X] bun installed but not on PATH. Restart your terminal and re-run.
    pause
    exit /b 1
  )
)

REM --- 2. Dependencies (skipped when already installed) ---
if not exist "node_modules" (
  echo [*] Installing dependencies - first run, takes a few minutes...
  call bun install
  if errorlevel 1 goto :fail
) else (
  echo [*] Dependencies already installed, skipping.
)

REM --- 3. Build ---
set "OPENCODE_CHANNEL=%CHANNEL%"
echo [*] Building [AoG] Hub (%CHANNEL%)...
call bun --filter @aog/hub-desktop build
if errorlevel 1 goto :fail

REM --- 4. Package the Windows installer ---
echo [*] Packaging Windows installer...
call bun --filter @aog/hub-desktop package:win
if errorlevel 1 goto :fail

set "EXE=packages\desktop\dist\aog-hub-win-x64.exe"
if not exist "%EXE%" (
  echo [X] Build finished but %EXE% was not produced.
  goto :fail
)
for %%F in ("%EXE%") do set /a MB=%%~zF/1048576
echo [OK] Done: %CD%\%EXE% (~%MB% MB)
pause
exit /b 0

:fail
echo [X] Build failed - see the errors above.
pause
exit /b 1
