@echo off
cd /d "%~dp0"
title SNI Scanner
echo.
echo ============================================
echo  SNI Scanner - Quick Start
echo ============================================
echo.
echo Step 1: Installing packages (first time only)...
echo.
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    echo Check your internet connection and try again.
    echo.
    pause
    exit /b 1
)
echo.
echo Step 2: Starting server...
echo.
echo Browser will open at http://localhost:3000
echo.
echo Press Ctrl+C to stop.
echo.
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
call npm run dev
pause
