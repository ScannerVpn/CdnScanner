@echo off
cd /d "%~dp0"
title SNI Scanner - Build Tauri EXE

echo ============================================
echo  SNI Scanner - Build Windows EXE (Tauri)
echo ============================================
echo.
echo Requirements:
echo   - Node.js 18+
echo   - Rust:           https://rustup.rs
echo   - MSVC BuildTools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo.
echo First build: 5-15 minutes (Rust compiles all deps).
echo Later builds are much faster.
echo.
pause

:: Verify required tools
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found
    pause & exit /b 1
)
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Rust/Cargo not found. Install from https://rustup.rs
    pause & exit /b 1
)

echo.
echo [1/4] Installing npm dependencies...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause & exit /b 1
)

echo.
echo [2/4] Building static frontend...
call npm run build:static
if %errorlevel% neq 0 (
    echo ERROR: frontend build failed
    pause & exit /b 1
)

if not exist "out\index.html" (
    echo ERROR: out\index.html not created. Static export failed.
    pause & exit /b 1
)

echo.
echo [3/4] Building Tauri Rust binary + installers...
echo (This compiles the Rust app and packages the .exe + installers)
call npm run tauri:build
if %errorlevel% neq 0 (
    echo ERROR: tauri build failed
    pause & exit /b 1
)

echo.
echo [4/4] Done!
echo.
echo ============================================
echo  SUCCESS!
echo ============================================
echo.
echo Installers created in:
echo   src-tauri\target\release\bundle\nsis\
echo   src-tauri\target\release\bundle\msi\
echo.
echo The app runs WITHOUT installing — just open the EXE:
echo   src-tauri\target\release\sni-scanner.exe
echo.
pause
