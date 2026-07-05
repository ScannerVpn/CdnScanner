@echo off
cd /d "%~dp0"
title Build SNI Scanner EXE with Tauri

echo ============================================
echo  SNI Scanner - Build Windows EXE (Tauri)
echo ============================================
echo.
echo This will build a small Windows EXE.
echo.
echo Prerequisites:
echo   - Node.js 18+ (https://nodejs.org)
echo   - Rust (https://rustup.rs)
echo   - Microsoft Visual Studio C++ Build Tools
echo     (https://visualstudio.microsoft.com/visual-cpp-build-tools/)
echo.
echo If you don't have Rust, install from: https://rustup.rs
echo.
pause

echo.
echo [1/3] Installing npm packages...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    echo Check your internet connection and try again.
    echo.
    pause
    exit /b 1
)
echo OK.

echo.
echo [2/3] Removing API routes (conflict with static export)...
:: tauri.conf.json has beforeBuildCommand that runs build:static
:: which does `cross-env TAURI_BUILD=true next build`.
:: API routes with force-dynamic conflict with output:export.
:: We MUST keep API removed during the entire tauri build.
if exist "src\app\api" (
    if exist "src\app\_api_backup" rmdir /s /q "src\app\_api_backup"
    xcopy /s /e /q /i "src\app\api" "src\app\_api_backup\" >nul
    rmdir /s /q "src\app\api"
)
echo OK.

echo.
echo [3/3] Building Windows EXE with Tauri...
echo This runs Next.js static build + Rust compilation (5-15 min first time).
echo.
call npx tauri build
set TAURI_RESULT=%ERRORLEVEL%

:: Restore API folder AFTER tauri build (success or failure)
if exist "src\app\_api_backup" (
    xcopy /s /e /q /i "src\app\_api_backup" "src\app\api\" >nul
    rmdir /s /q "src\app\_api_backup"
    echo API routes restored.
)

if %TAURI_RESULT% neq 0 (
    echo.
    echo ERROR: Tauri build failed.
    echo.
    echo Make sure you have installed:
    echo   1. Rust: https://rustup.rs
    echo   2. Visual Studio C++ Build Tools
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  DONE!
echo ============================================
echo.
echo EXE files are in: src-tauri\target\release\bundle\
echo.
pause
