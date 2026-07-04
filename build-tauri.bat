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
echo [1/4] Installing npm packages...
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
echo [2/4] Preparing static build (temporarily excluding API routes)...
:: API routes conflict with Next.js static export.
:: Back up the API folder, build, then restore.
if exist "src\app\api" (
    if exist "src\app\_api_backup" rmdir /s /q "src\app\_api_backup"
    xcopy /s /e /q /i "src\app\api" "src\app\_api_backup\" >nul
    rmdir /s /q "src\app\api"
)
echo OK.

echo.
echo [3/4] Building static Next.js app...
call npx next build
set BUILD_RESULT=%ERRORLEVEL%
:: Restore API folder regardless of build result
if exist "src\app\_api_backup" (
    xcopy /s /e /q /i "src\app\_api_backup" "src\app\api\" >nul
    rmdir /s /q "src\app\_api_backup"
)
if %BUILD_RESULT% neq 0 (
    echo.
    echo ERROR: Next.js static build failed.
    echo Check the error output above.
    echo.
    pause
    exit /b 1
)
echo OK.

echo.
echo [4/4] Building Windows EXE with Tauri...
echo This takes 5-15 minutes the first time (Rust compilation).
echo.
call npx tauri build
if errorlevel 1 (
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
