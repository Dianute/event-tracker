Write-Host "🔧 Starting Menu System Fix..." -ForegroundColor Cyan

# 1. Kill any existing node server
Write-Host "Killing old server processes..." -ForegroundColor Yellow
Stop-Process -Name "node" -ErrorAction SilentlyContinue

# 2. Navigate to backend
Set-Location "c:\Users\Algis\Desktop\Antigravity\event tracker\backend"

# 3. Run Schema Migration
Write-Host "running database migration..." -ForegroundColor Cyan
node migrate_menus.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration Failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit
}

# 4. Start Server
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
Write-Host "Do not close this window." -ForegroundColor Gray
node server.js
