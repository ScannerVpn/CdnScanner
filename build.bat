@echo off
cd /d "%~dp0"
title SNI Scanner - Build

echo ============================================
echo  SNI Scanner - Build
echo ============================================
echo.
echo Requirements: Node.js 18+
echo.
pause

:: Install
echo.
echo [1/2] Install...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

:: Build
echo.
echo [2/2] Build...
call npx next build
if %errorlevel% neq 0 (
    echo ERROR: build failed
    pause
    exit /b 1
)

:: Package
echo.
echo Packaging...
if exist "dist" rmdir /s /q "dist"
mkdir dist
xcopy /s /e /q /i ".next\standalone" "dist\" >nul
if not exist "dist\.next\static" mkdir "dist\.next\static"
xcopy /s /e /q /i ".next\static" "dist\.next\static\" >nul

:: Launcher
(
echo @echo off
echo cd /d "%%~dp0"
echo echo SNI Scanner - http://localhost:3000
echo echo Press Ctrl+C to stop.
echo start "" "http://localhost:3000"
echo node server.js
echo pause
) > dist\start.bat

:: Cleanup
rmdir /s /q "dist\.next\server\app" 2>nul
rmdir /s /q "dist\.next\server\pages" 2>nul

echo.
echo ============================================
echo  DONE! dist\ folder is ready.
echo  Run: dist\start.bat
echo ============================================
pause
