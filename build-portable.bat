@echo off
cd /d "%~dp0"
title SNI Scanner - Build Portable Package

echo ============================================
echo  SNI Scanner - Portable Build
echo ============================================
echo.
echo Creates a folder that runs on any PC with Node.js 18+.
echo.
pause

echo.
echo [1/3] Installing packages...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Building server (standalone mode)...
call npx next build
if %errorlevel% neq 0 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Packaging...

if exist "dist" rmdir /s /q "dist"
mkdir dist\server

:: Copy standalone output (server + minimal node_modules)
xcopy /s /e /q /i ".next\standalone" "dist\server\" >nul

:: Copy static frontend assets into the right place
if not exist "dist\server\.next\static" mkdir "dist\server\.next\static"
xcopy /s /e /q /i ".next\static" "dist\server\.next\static\" >nul

:: Create launcher
> dist\start.bat (
    echo @echo off
    echo cd /d "%%~dp0server"
    echo echo.
    echo echo ============================================
    echo echo  SNI Scanner
    echo echo ============================================
    echo echo.
    echo echo Server: http://localhost:3000
    echo echo Close this window to stop.
    echo echo.
    echo start "" "http://localhost:3000"
    echo node server.js
    echo pause
)

echo.
echo ============================================
echo  BUILD DONE!
echo ============================================
echo.
echo  Output: dist\ folder
echo  Run:    dist\start.bat
echo  Needs:  Node.js 18+ on target PC
echo.
echo  Share the entire dist\ folder.
echo.
pause
