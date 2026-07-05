@echo off
cd /d "%~dp0"
title Build SNI Scanner EXE

echo ============================================
echo  SNI Scanner - Build Windows EXE
echo ============================================
echo.
echo Prerequisites: Node.js 18+, Rust, VS C++ Build Tools
echo.
pause

:: Step 1: Install packages
echo.
echo [1/3] Installing packages...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm install failed.
    echo.
    pause
    exit /b 1
)
echo OK.

:: Step 2: Remove API routes (conflict with static export)
echo.
echo [2/3] Preparing build...
if not exist "src\app\api" goto :skip_backup
if exist "src\app\_api_backup" rmdir /s /q "src\app\_api_backup"
xcopy /s /e /q /i "src\app\api" "src\app\_api_backup\" >nul
rmdir /s /q "src\app\api"
echo API routes backed up and removed.
:skip_backup

:: Step 3: Build with Tauri
echo.
echo [3/3] Building EXE (first time: 5-15 min)...
echo.
npx tauri build
set TAURI_EXIT=%errorlevel%

:: Always restore API
if exist "src\app\_api_backup" (
    xcopy /s /e /q /i "src\app\_api_backup" "src\app\api\" >nul
    rmdir /s /q "src\app\_api_backup"
    echo.
    echo API routes restored.
)

:: Report result
echo.
echo ============================================
if %TAURI_EXIT% neq 0 (
    echo  BUILD FAILED - see errors above
    echo.
    echo  Common fixes:
    echo   - Install Rust: https://rustup.rs
    echo   - Install VS C++ Build Tools
) else (
    echo  BUILD SUCCESSFUL!
    echo.
    echo  EXE:   src-tauri\target\release\sni-scanner.exe
    echo  Setup: src-tauri\target\release\bundle\nsis\
)
echo ============================================
echo.
pause
