# GastroPartner

En modulär SaaS-plattform för småskaliga livsmedelsproducenter, restauranger och krögare.

## 🚀 Status

- ✅ Hello World deployment fungerar lokalt
- 🔄 Staging deployment pågår
- ⏳ Production deployment på gastropartner.nu väntar

## 📁 Projektstruktur

```
gastropartner/
├── gastropartner-backend/     # Python/FastAPI backend
│   ├── src/
│   │   └── gastropartner/
│   │       ├── api/          # API endpoints
│   │       ├── core/         # Core business logic
│   │       └── tests/        # Tests (bredvid koden)
│   └── pyproject.toml        # UV package management
│
├── gastropartner-frontend/    # React/TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   └── App.tsx
│   └── package.json
│
└── .github/
    └── workflows/            # CI/CD pipelines
```

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, UV
- **Frontend**: React, TypeScript
- **Database**: Supabase (molnet)
- **Deployment**: TBD (Railway/Render för backend, Vercel för frontend)
- **Domain**: gastropartner.nu

## 🏃 Utveckling

### Backend

```bash
cd gastropartner-backend
uv sync
uv run uvicorn src.gastropartner.main:app --reload
# Öppna http://localhost:8000
```

### Frontend

```bash
cd gastropartner-frontend
npm install
npm start
# Öppna http://localhost:3000
```

### Tester

```bash
# Backend
cd gastropartner-backend
uv run pytest

# Frontend
cd gastropartner-frontend
npm test
```

## 🔐 Miljövariabler

Backend kräver `.env.development` med:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

Frontend kräver `.env` med:
- `REACT_APP_API_URL`
- `REACT_APP_ENV`

## 📝 Nästa Steg

1. [x] Hello World lokalt
2. [ ] GitHub Actions CI/CD
3. [ ] Staging deployment
4. [ ] Production deployment på gastropartner.nu
5. [ ] Multitenant databas schema
6. [ ] Första modulen: Kostnadskontroll

## 📚 Dokumentation

Se [CLAUDE.md](./CLAUDE.md) för utvecklingsriktlinjer och konventioner.