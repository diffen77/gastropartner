#!/bin/bash
# Optimized build script for Render deployment
set -e

echo "🚀 Starting optimized GastroPartner backend build..."

# Use pip for faster dependency installation (alternative to uv)
pip install --no-cache-dir -r requirements.txt

echo "✅ Build complete - production dependencies only"