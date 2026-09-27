# Start React dev server (run from project root)
# Usage: .\start_frontend.ps1

Write-Host "Starting Vite dev server on http://localhost:5173 ..." -ForegroundColor Cyan
Set-Location frontend
npm run dev
