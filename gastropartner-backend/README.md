# GastroPartner Backend

Backend API för GastroPartner - SaaS för restauranger och livsmedelsproducenter.

## Tech Stack
- Python 3.11+
- FastAPI
- Supabase
- UV package manager

## Installation

```bash
# Installera UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Skapa virtual environment
uv venv

# Installera dependencies
uv sync
```

## Utveckling

```bash
# Starta utvecklingsserver
uv run uvicorn src.gastropartner.main:app --reload

# Kör tester
uv run pytest

# Linting
uv run ruff check .
uv run ruff format .

# Type checking
uv run mypy src/
```

## Miljövariabler

Kopiera `.env.example` till `.env.development` och uppdatera värden:

- `SUPABASE_URL`: Din Supabase projekt URL
- `SUPABASE_ANON_KEY`: Din Supabase anon key
- `SUPABASE_SERVICE_KEY`: Din Supabase service key (endast för admin)

## Deployment

Staging och production deployments hanteras via GitHub Actions.