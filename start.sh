#!/bin/bash

# Space Bio KG Web Development - Standalone Startup Script
# This script starts both the FastAPI backend and Next.js frontend

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Space Bio KG - Standalone Startup ===${NC}"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if .env.backend exists
if [ ! -f ".env.backend" ]; then
    echo -e "${RED}Error: .env.backend not found${NC}"
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${RED}Error: Python virtual environment not found${NC}"
    echo "Please run: python3.10 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}Error: node_modules not found${NC}"
    echo "Please run: npm install"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.backend | xargs)

# Function to cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down services...${NC}"
    if [ ! -z "$FASTAPI_PID" ]; then
        kill $FASTAPI_PID 2>/dev/null || true
    fi
    if [ ! -z "$NEXTJS_PID" ]; then
        kill $NEXTJS_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start FastAPI backend
echo -e "${GREEN}Starting FastAPI backend on port 8000...${NC}"
source venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 > logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
echo -e "${GREEN}✓ FastAPI PID: $FASTAPI_PID${NC}"

# Wait for FastAPI to start
sleep 3

# Check if FastAPI is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${RED}Error: FastAPI failed to start${NC}"
    cat logs/fastapi.log
    exit 1
fi

# Start Next.js frontend
echo -e "${GREEN}Starting Next.js frontend...${NC}"
npm run dev > logs/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo -e "${GREEN}✓ Next.js PID: $NEXTJS_PID${NC}"

# Wait for Next.js to start
sleep 5

echo -e "${GREEN}=== Services Started ===${NC}"
echo -e "${BLUE}FastAPI Backend:${NC} http://localhost:8000"
echo -e "${BLUE}Next.js Frontend:${NC} http://localhost:3000 (or check logs/nextjs.log for actual port)"
echo -e "${BLUE}Health Check:${NC} http://localhost:8000/health"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  - FastAPI: logs/fastapi.log"
echo -e "  - Next.js: logs/nextjs.log"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"

# Wait for user interrupt
wait
