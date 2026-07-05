@echo off
cd /d "%~dp0"
title SNI Scanner - Build Android APK (Tauri)

echo ============================================
echo  SNI Scanner - Build Android (Tauri)
echo ============================================
echo.
echo Requirements:
echo   - Node.js 20+
echo   - Rust (stable) with android targets:
echo       rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
echo   - Android SDK + NDK ^(via Android Studio^)
echo   - JDK 17+ (Temurin recommended)
echo.
echo First build: 10-25 minutes (Rust + Gradle downloads).
echo Later builds are much faster (~3-5 min).
echo.
pause

:: ------------------------------------------------------------------
:: 1) Verify prerequisites
:: ------------------------------------------------------------------
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

where java >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: java not found in PATH.
    echo          Android Gradle build needs JDK 17+. Set JAVA_HOME manually.
) else (
    for /f "tokens=*" %%v in ('java -version 2^>^&1') do echo [java] %%v
)

if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    echo WARNING: ANDROID_HOME / ANDROID_SDK_ROOT not set.
    echo          Tauri will look at default locations: %%LOCALAPPDATA%%\Android\Sdk
) else (
    echo [android] SDK: %ANDROID_HOME%%ANDROID_SDK_ROOT%
)

:: ------------------------------------------------------------------
:: 2) npm install
:: ------------------------------------------------------------------
echo.
echo [1/5] Installing npm dependencies...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause & exit /b 1
)

:: ------------------------------------------------------------------
:: 3) Initialize the Android project (one-time, idempotent)
:: ------------------------------------------------------------------
if not exist "src-tauri\gen\android" (
    echo.
    echo [2/5] Initializing Android project (one-time)...
    call npx tauri android init
    if %errorlevel% neq 0 (
        echo ERROR: tauri android init failed - check Android SDK + NDK installation
        pause & exit /b 1
    )
) else (
    echo [2/5] Android project already initialized at src-tauri\gen\android
)

:: ------------------------------------------------------------------
:: 4) Build static frontend
:: ------------------------------------------------------------------
echo.
echo [3/5] Building static frontend for Tauri...
call npm run build:static
if %errorlevel% neq 0 (
    echo ERROR: frontend build failed
    pause & exit /b 1
)

if not exist "out\index.html" (
    echo ERROR: out\index.html not created. Static export failed.
    pause & exit /b 1
)

:: ------------------------------------------------------------------
:: 5) Build Android APK
:: ------------------------------------------------------------------
echo.
echo [4/5] Building Android APK (this takes a while)...
call npx tauri android build --apk
if %errorlevel% neq 0 (
    echo ERROR: Android build failed. See above Gradle output for the root cause.
    pause & exit /b 1
)

:: ------------------------------------------------------------------
:: 6) Report output
:: ------------------------------------------------------------------
echo.
echo [5/5] Done!
echo.
echo ============================================
echo  SUCCESS!
echo ============================================
echo.
echo APK output in:
echo   src-tauri\gen\android\app\build\outputs\apk\release\
echo   src-tauri\gen\android\app\build\outputs\apk\debug\
echo.
echo To install on a connected device:
echo   adb install -r src-tauri\gen\android\app\build\outputs\apk\release\app-release.apk
echo.
echo For dev mode with hot-reload: npm run tauri:android
echo.
pause
