@echo off
cd /d "%~dp0"
title SNI Scanner (Desktop)

echo ============================================
echo  SNI Scanner - Desktop App
echo ============================================
echo.
echo This starts the dev server + Tauri window.
echo Close this window to stop everything.
echo.
pause

echo.
echo Starting Tauri dev mode...
echo.
call npx tauri dev
pause
