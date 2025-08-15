#!/bin/bash
"""
GastroPartner Test Dashboard Starter
Startar både API server och nginx dashboard
"""

set -e

echo "🚀 Startar GastroPartner Test Dashboard..."

# Kontrollera Python dependencies
echo "📦 Kontrollerar Python dependencies..."
if ! pip show flask > /dev/null 2>&1; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Kontrollera Playwright browsers
echo "🌐 Kontrollerar Playwright browsers..."
if [ ! -d ~/.cache/ms-playwright ]; then
    echo "Installerar Playwright browsers..."
    playwright install
fi

# Starta API server i bakgrunden
echo "⚡ Startar Test API Server..."
python test_api_server.py &
API_PID=$!

# Vänta lite för att API ska starta
sleep 3

# Kontrollera att API server är igång
if ! curl -s http://localhost:5001/health > /dev/null; then
    echo "❌ API server startade inte korrekt"
    kill $API_PID 2>/dev/null || true
    exit 1
fi

echo "✅ API Server igång på port 5001"

# Starta nginx/dashboard
echo "📊 Startar Dashboard..."
if command -v docker-compose > /dev/null; then
    docker-compose up -d dashboard
elif command -v docker > /dev/null && [ -f docker-compose.yml ]; then
    docker compose up -d dashboard
else
    # Fallback: starta en enkel HTTP server för dashboarden
    echo "📂 Startar enkel HTTP server för dashboard..."
    cd dashboard
    python -m http.server 8080 &
    HTTP_PID=$!
    cd ..
    echo "✅ Dashboard tillgänglig på http://localhost:8080"
fi

echo ""
echo "🎉 GastroPartner Test Dashboard är nu igång!"
echo ""
echo "📊 Dashboard: http://localhost:8080"
echo "⚡ API Server: http://localhost:5001"
echo "📈 Health Check: http://localhost:5001/health"
echo ""
echo "Tryck Ctrl+C för att stoppa..."

# Vänta på interrupt signal
trap 'echo "🛑 Stänger ned..."; kill $API_PID 2>/dev/null || true; kill $HTTP_PID 2>/dev/null || true; docker-compose down 2>/dev/null || true; exit 0' INT

# Håll scriptet igång
wait