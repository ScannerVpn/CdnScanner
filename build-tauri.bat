@echo off
cd /d "%~dp0"
title Build SNI Scanner EXE with Tauri

echo ============================================
echo  SNI Scanner - Build Windows EXE (Tauri)
echo ============================================
echo.
echo NOTE: The EXE needs Node.js installed on the target PC.
echo       For a standalone app, use start-tauri.bat instead.
echo.
pause

echo.
echo [1/2] Installing packages...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo ERROR: npm install failed.
    goto :end
)

echo.
echo [2/2] Building...
echo.

:: Remove API routes for static build
if exist "src\app\api" (
    if exist "src\app\_api_backup" rmdir /s /q "src\app\_api_backup"
    xcopy /s /e /q /i "src\app\api" "src\app\_api_backup\" >nul
    rmdir /s /q "src\app\api"
    echo API routes backed up.
)

call npx tauri build

:: Restore API
if exist "src\app\_api_backup" (
    xcopy /s /e /q /i "src\app\_api_backup" "src\app\api\" >nul
    rmdir /s /q "src\app\_api_backup"
    echo API routes restored.
)

:end
echo.
echo ============================================
if %errorlevel% neq 0 (
    echo  BUILD FAILED - check errors above
) else (
    echo  BUILD SUCCESSFUL!
    echo.
    echo  EXE:   src-tauri\target\release\sni-scanner.exe
    echo  Setup: src-tauri\target\release\bundle\nsis\
)
echo ============================================
echo.
pause
