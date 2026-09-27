#!/usr/bin/env bash
set -e

echo "🚀 [Replit] Starting Personalized Learning Path Recommender..."

# 1. Install Python dependencies
echo "📦 [Replit] Checking Python dependencies..."
pip install -r requirements.txt --quiet

# 2. Build React frontend if not already built
if [ ! -d "frontend/dist" ] || [ ! -f "frontend/dist/index.html" ]; then
    echo "🎨 [Replit] Installing frontend dependencies & building for production..."
    cd frontend
    npm install --quiet
    npm run build
    cd ..
    echo "✅ [Replit] Frontend build complete!"
fi

# 3. Check for ML model bundle
if [ ! -f "models/best_model.pkl" ]; then
    echo "⚠️  [Replit] Notice: 'models/best_model.pkl' not found."
    echo "👉 You can drag & drop your local 'models/best_model.pkl' into Replit's models/ folder,"
    echo "   or run 'python src/train.py' in the Replit Console to train."
    echo "   The app and AI features will function immediately regardless!"
fi

# 4. Start FastAPI server (serves both React UI and REST API on $PORT)
PORT="${PORT:-8000}"
HOST="0.0.0.0"

echo "✨ [Replit] App is live on http://$HOST:$PORT !"
exec python -m uvicorn src.api:app --host "$HOST" --port "$PORT"
