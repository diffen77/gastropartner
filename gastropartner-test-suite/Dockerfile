# Dockerfile för GastroPartner Test Suite
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Installera system dependencies (Node.js redan inkluderat i Playwright image)
RUN apt-get update && apt-get install -y \
    python3-pip \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Kopiera requirements först för Docker layer caching
COPY requirements.txt package.json ./

# Installera Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Installera Node.js dependencies
RUN npm install

# Installera Playwright browsers
RUN playwright install chromium firefox webkit
RUN playwright install-deps

# Kopiera resten av testsviten
COPY . .

# Skapa directories för output
RUN mkdir -p /app/reports /app/screenshots /app/logs

# Sätt permissions för Python scripts
RUN chmod +x scripts/*.py || true

# Environment variables
ENV PYTHONPATH=/app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_PATH=/app/node_modules

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import playwright; print('OK')" || exit 1

# Default command
CMD ["python3", "run_tests.py"]