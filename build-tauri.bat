@echo off
cd /d "%~dp0"
title Build SNI Scanner EXE with Tauri

echo ============================================
echo  SNI Scanner - Build Windows EXE (Tauri)
echo ============================================
echo.
echo Prerequisites:
echo   - Node.js 18+ (https://nodejs.org)
echo   - Rust (https://rustup.rs)
echo   - Microsoft Visual Studio C++ Build Tools
echo     (https://visualstudio.microsoft.com/visual-cpp-build-tools/)
echo.
pause

echo.
echo [1/2] Installing packages...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo OK.

echo.
echo [2/2] Building EXE (first time: 5-15 min for Rust compilation)...
echo.

:: Remove API routes — they conflict with static export
if exist "src\app\api" (
    if exist "src\app\_api_backup" rmdir /s /q "src\app\_api_backup"
    xcopy /s /e /q /i "src\app\api" "src\app\_api_backup\" >nul
    rmdir /s /q "src\app\api"
    echo API routes backed up.
)

:: Run tauri build
call npx tauri build

:: ALWAYS restore API, even on failure
if exist "src\app\_api_backup" (
    xcopy /s /e /q /i "src\app\_api_backup" "src\app\api\" >nul
    rmdir /s /q "src\app\_api_backup"
    echo API routes restored.
)

echo.
if %errorlevel% neq 0 (
    echo ERROR: Build failed. Check the output above.
) else (
    echo ============================================
    echo  BUILD SUCCESSFUL!
    echo ============================================
    echo.
    echo EXE:  src-tauri\target\release\sni-scanner.exe
    echo Setup: src-tauri\target\release\bundle\nsis\
)
echo.
pause
