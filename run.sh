#!/bin/bash
set -e
cd "dirname """

echo "===================================================="
echo "   TASK UNITY -- Cooperative Gig Platform"
echo "===================================================="

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing root dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "[2/3] Installing client dependencies..."
    npm --prefix client install
fi

if [ ! -d "client/dist" ]; then
    echo "[3/3] Building client frontend..."
    npm --prefix client run build
fi

echo "Starting server at http://localhost:5000..."

if command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open http://localhost:5000) &
elif command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:5000) &
fi

npm run server
