# Säker Development Setup

Efter att vi tagit bort exponerade .env filer, här är hur du sätter upp säker development:

## 🔐 Steg 1: Regenerera API Nycklar

### Supabase Service Key:
1. Gå till https://supabase.com/dashboard/project/mrfxvnobevzcxsdlznyp/settings/api
2. Anteckna den nuvarande service key:n (så du vet vilken som ska bytas ut)
3. Skapa nytt projekt ELLER vänta på Supabase key rotation feature

### OpenAI API Key:
1. Gå till https://platform.openai.com/api-keys
2. Revoke den gamla nyckeln: `sk-proj-UXlDTdGmC_GkT2WTZ6Eba...`
3. Skapa ny API key

### GitHub Token (om behövs):
1. Gå till https://github.com/settings/tokens
2. Revoke den gamla exponerade token:n
3. Skapa nytt personal access token

## 🔧 Steg 2: Lokal Development Setup

### Alternativ A: Environment Variables (Rekommenderat)
Applikationen stöder `GASTROPARTNER_` prefix för environment variables:

```bash
# Lägg till i din ~/.bashrc eller ~/.zshrc:
export GASTROPARTNER_SUPABASE_URL="https://mrfxvnobevzcxsdlznyp.supabase.co"
export GASTROPARTNER_SUPABASE_ANON_KEY="eyJhbGciOi..." # Public key - OK att ha
export GASTROPARTNER_SUPABASE_SERVICE_KEY="your_new_service_key_here"
export GASTROPARTNER_OPENAI_API_KEY="your_new_openai_key_here"

# Reload terminal:
source ~/.bashrc
```

**ELLER utan prefix (fungerar också):**
```bash
export SUPABASE_URL="https://mrfxvnobevzcxsdlznyp.supabase.co"
export SUPABASE_SERVICE_KEY="your_new_service_key_here"
export OPENAI_API_KEY="your_new_openai_key_here"
```

### Alternativ B: Lokal .env fil (Säker)
```bash
# 1. Kopiera template:
cd gastropartner-backend
cp .env.development.template .env.development

# 2. Redigera med nya nycklar:
nano .env.development

# 3. Verifiera att den INTE committas:
git status  # ska INTE visa .env.development
```

### Alternativ C: Direkt i terminal
```bash
# Före varje development session:
cd gastropartner-backend

export SUPABASE_SERVICE_KEY="your_new_key"
export OPENAI_API_KEY="your_new_key" 

uv run uvicorn src.gastropartner.main:app --reload
```

## 🚀 Steg 3: Starta Development

```bash
# Backend:
cd gastropartner-backend
uv run uvicorn src.gastropartner.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (ny terminal):
cd gastropartner-frontend  
npm start
```

## 🛡️ Säkerhetsregler

### ✅ DO:
- Använd environment variables för nya secrets
- Skapa lokala .env filer (de blockeras av .gitignore)
- Använd olika nycklar för dev/staging/production
- Rotera nycklar regelbundet

### ❌ DON'T:
- ALDRIG committa .env filer med secrets
- ALDRIG dela API keys i chat/email
- ALDRIG hårdkoda secrets i kod
- ALDRIG push:a .env filer till remote

## 🔍 Verifiera Setup

```bash
# Kontrollera att miljövariabler finns:
echo $SUPABASE_SERVICE_KEY
echo $OPENAI_API_KEY

# Testa Supabase anslutning:
cd gastropartner-backend
uv run python -c "
import os
from src.gastropartner.core.database import get_supabase_client
client = get_supabase_client()
print('Supabase connection: OK')
"
```

## 🎯 Production Deployment

För production, använd:
- **Render**: Environment Variables i dashboard
- **Vercel**: Environment Variables i settings
- **Docker**: ENV files eller secrets management
- **GitHub Actions**: Repository secrets

Secrets ska ALDRIG finnas i kod, alltid i miljövariabler eller secrets management system.