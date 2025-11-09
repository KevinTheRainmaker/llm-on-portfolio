#!/bin/bash

# Start script for LLM Chat Python server

echo "Starting LLM Chat Python Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Please copy .env.example to .env and configure your API keys."
    echo "Continuing with default environment variables..."
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server
echo "Starting FastAPI server on http://localhost:8000..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
