@echo off
cd /d "%~dp0"
title SNI Scanner

echo ============================================
echo  SNI Scanner
echo ============================================
echo.

call npm install --no-audit --no-fund --loglevel=error
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo Starting... http://localhost:3000
start "" "http://localhost:3000"
call npm run dev
pause
