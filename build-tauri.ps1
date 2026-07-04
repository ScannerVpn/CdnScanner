# SNI Scanner - Build EXE with Tauri (PowerShell)
# Run: Right-click -> Run with PowerShell

Set-Location -Path $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "Build SNI Scanner EXE"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SNI Scanner - Build Windows EXE (Tauri)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host
Write-Host "This will build a small (~5MB) Windows EXE." -ForegroundColor White
Write-Host
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  - Node.js 18+: https://nodejs.org"
Write-Host "  - Rust: https://rustup.rs"
Write-Host "  - Microsoft Visual Studio C++ Build Tools:"
Write-Host "    https://visualstudio.microsoft.com/visual-cpp-build-tools/"
Write-Host
Read-Host "Press Enter to continue, or Ctrl+C to cancel"

Write-Host
Write-Host "[1/3] Installing npm packages..." -ForegroundColor Yellow
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host
Write-Host "[2/3] Building static Next.js app..." -ForegroundColor Yellow
npm run build:static
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Next.js build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host
Write-Host "[3/3] Building Windows EXE with Tauri..." -ForegroundColor Yellow
Write-Host "This takes 5-15 minutes the first time (Rust compilation)." -ForegroundColor White
Write-Host
npm run tauri:build
if ($LASTEXITCODE -ne 0) {
    Write-Host
    Write-Host "ERROR: Tauri build failed." -ForegroundColor Red
    Write-Host
    Write-Host "Make sure you have installed:" -ForegroundColor Yellow
    Write-Host "  1. Rust: https://rustup.rs"
    Write-Host "  2. Visual Studio C++ Build Tools"
    Write-Host
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DONE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host
Write-Host "EXE files are in: src-tauri\target\release\bundle\" -ForegroundColor White
Write-Host "  - nsis\SNI-Scanner_1.0.0_x64-setup.exe (installer)"
Write-Host "  - msi\SNI-Scanner_1.0.0_x64_en-US.msi (MSI installer)"
Write-Host
Read-Host "Press Enter to exit"
