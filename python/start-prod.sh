#!/bin/bash

# Production start script for LLM Chat Python server

echo "Starting LLM Chat Python Server (Production Mode)..."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server with multiple workers
echo "Starting FastAPI server on http://0.0.0.0:8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
