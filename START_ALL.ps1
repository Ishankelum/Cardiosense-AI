# CardioSense AI — Start All Services
# Run this from the project root: .\START_ALL.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "============================================"
Write-Host "  CardioSense AI — Starting All Services"
Write-Host "============================================"

# 1. Flask AI Service
Write-Host "`n[1] Starting Python AI Service (port 5002)..."
Start-Process -FilePath "python" `
  -ArgumentList "$root\ai_service\app.py" `
  -WorkingDirectory "$root\ai_service" `
  -WindowStyle Normal

Start-Sleep -Seconds 3

# 2. Node.js Backend
Write-Host "[2] Starting Node.js Backend (port 5001)..."
Start-Process -FilePath "node" `
  -ArgumentList "server.js" `
  -WorkingDirectory "$root\backend" `
  -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. React Frontend (Vite)
Write-Host "[3] Starting React Frontend (port 5173)..."
Start-Process -FilePath "npm" `
  -ArgumentList "run", "dev" `
  -WorkingDirectory "$root" `
  -WindowStyle Normal

Write-Host ""
Write-Host "All services starting..."
Write-Host ""
Write-Host "  React Dashboard  ->  http://localhost:5173"
Write-Host "  Node.js API      ->  http://localhost:5001/api/health"
Write-Host "  Python AI        ->  http://localhost:5002/health"
Write-Host ""
