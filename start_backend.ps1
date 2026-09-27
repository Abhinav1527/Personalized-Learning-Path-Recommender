# Start FastAPI backend (run from project root)
# Usage: .\start_backend.ps1

Write-Host "Starting FastAPI backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
.\venv\Scripts\python.exe -m uvicorn src.api:app --host 127.0.0.1 --port 8000 --reload
