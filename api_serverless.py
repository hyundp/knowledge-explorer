"""
Vercel Serverless Function wrapper for FastAPI

This file allows the FastAPI app to run as a Vercel serverless function.
"""

from api.main import app

# Vercel requires a handler function
# This exports the FastAPI app for Vercel to use
handler = app
