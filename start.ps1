# SNI Scanner - Quick Start
# Right-click this file -> Run with PowerShell
# Or: powershell -ExecutionPolicy Bypass -File start.ps1

Set-Location -Path $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "SNI Scanner"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SNI Scanner - Starting..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeExe = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeExe) {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js LTS from:" -ForegroundColor Yellow
    Write-Host "  https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing, restart your computer and run this again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
$npmExe = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmExe) {
    Write-Host "ERROR: npm not found!" -ForegroundColor Red
    Write-Host "Please install Node.js LTS from: https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js found:" -ForegroundColor Green
node --version
Write-Host ""

# Install packages if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "First time setup - installing packages..." -ForegroundColor Yellow
    Write-Host "This takes 1-3 minutes. Please wait..." -ForegroundColor Yellow
    Write-Host ""
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Red
        Write-Host "  Installation failed!" -ForegroundColor Red
        Write-Host "============================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Yellow
        Write-Host "  1. Check your internet connection"
        Write-Host "  2. Run PowerShell as Administrator"
        Write-Host "  3. Try: npm install --legacy-peer-deps"
        Write-Host "  4. Move this folder out of OneDrive"
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Green
Write-Host "  Starting SNI Scanner..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Browser will open at: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "To stop: press Ctrl+C or close this window" -ForegroundColor Yellow
Write-Host ""

# Open browser after 5 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000"
} | Out-Null

# Start the dev server
Write-Host "Running: npm run dev" -ForegroundColor Cyan
Write-Host ""
npm run dev

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
