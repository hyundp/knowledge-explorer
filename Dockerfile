# FastAPI Backend Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api/ ./api/
COPY kg/ ./kg/
COPY data/ ./data/
COPY cache/ ./cache/

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start command
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
