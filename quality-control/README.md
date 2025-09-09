# GastroPartner Quality Control System 🛡️

Automatiserat kvalitetskontrollsystem med AI-drivna agenter för GastroPartner SaaS-applikationen.

## ✨ Funktioner

### 🤖 AI-Drivna Agenter
- **Security Agent**: Multi-tenant säkerhetskontroller, SQL injection-skydd, hårdkodade secrets
- **Functional Agent**: TypeScript/React funktionell korrekthet, hook-regler, API-validering  
- **Design Agent**: UI-konsistens, accessibility (WCAG 2.1 AA), design system
- **Backend Agent**: Python/FastAPI-kodkvalitet, PEP 8-standarder, databassäkerhet

### 🔍 Validering
- **Realtidsövervakning**: Automatisk validering vid filändringar
- **Pattern-baserad kontroll**: Regex-baserade säkerhetskontroller
- **AI-analys**: Intelligent kodanalys med OpenAI GPT-4
- **Multi-tenant fokus**: Säkerställer organization_id-filtrering i alla databasfrågor

### 📊 Rapportering
- **Rich Console**: Färgkodade resultat med detaljer
- **Caching**: Intelligent caching av valideringsresultat (5 min TTL)
- **Statistik**: Prestanda- och kvalitetsmätningar
- **Mönsteranalys**: Identifiering av problematiska filer och förändringsmönster

## 🚀 Installation & Setup

### 1. Krav
- Python 3.11+
- UV package manager
- OpenAI API-nyckel

### 2. Miljövariabler
Lägg till i `gastropartner-backend/.env.development`:
```bash
OPENAI_API_KEY=din-openai-api-nyckel-här
```

### 3. Beroenden
Alla beroenden installeras automatiskt via UV när systemet körs från `gastropartner-backend`-mappen.

## 📖 Användning

### Enkelt Startup Script
```bash
# Gör scriptet körbart (första gången)
chmod +x start_quality_control.sh

# Starta realtidsövervakning
./start_quality_control.sh monitor

# Validera specifik fil
./start_quality_control.sh validate src/components/MyComponent.tsx

# Snabbkommandon
./start_quality_control.sh frontend    # Validera alla frontend-filer
./start_quality_control.sh backend     # Validera alla backend-filer
./start_quality_control.sh all         # Validera hela projektet
```

### Direkta Kommandon
```bash
cd gastropartner-backend

# Realtidsövervakning
OPENAI_API_KEY="..." uv run python ../quality-control/main.py monitor

# Validera fil
OPENAI_API_KEY="..." uv run python ../quality-control/main.py validate ../path/to/file.py

# Validera mapp
OPENAI_API_KEY="..." uv run python ../quality-control/main.py validate ../gastropartner-frontend/src

# Systemstatus
OPENAI_API_KEY="..." uv run python ../quality-control/main.py status

# Förändringsmönster
OPENAI_API_KEY="..." uv run python ../quality-control/main.py patterns
```

## ⚙️ Konfiguration

### Agent-konfiguration (`config/agent_config.yaml`)
- **Modeller**: GPT-4o för säkerhet, GPT-4o-mini för andra agenter
- **Temperatur**: 0.0-0.2 för konsistenta resultat
- **Samtidighet**: Max 3 parallella agenter
- **Caching**: 5 minuters TTL, max 1000 resultat

### Valideringsregler (`config/validation_rules.yaml`)
- **Multi-tenant säkerhet**: Obligatorisk organization_id-filtrering
- **Kodkvalitet**: TypeScript strict mode, Python type hints
- **Prestanda**: Bundle size limits, response time gränser
- **Accessibility**: WCAG 2.1 AA compliance

## 🛡️ Säkerhetsfokus för GastroPartner

### Kritiska Kontroller
1. **Multi-tenant Isolation**: Alla databasfrågor MÅSTE filtrera på `organization_id`
2. **Ingen Hårdkodade Secrets**: Automatisk detektering av passwords, API-nycklar
3. **SQL Injection Skydd**: Validering av parametriserade frågor
4. **Authentication**: JWT-validering och behörighetskontroller

### Exempel på Detekterade Problem
```python
# ❌ SÄKERHETSFEL - saknar organization_id
def get_users():
    return db.query("SELECT * FROM users")

# ✅ KORREKT - med organization_id-filtrering  
def get_users(org_id: str):
    return db.query("SELECT * FROM users WHERE organization_id = ?", org_id)
```

## 📈 Kvalitetsmätningar

### Täckningsgrad
- **Minimum**: 80% kodtäckning
- **Kritiska vägar**: 95% täckning
- **Komplexitet**: Max 10 cyklomatisk, 15 kognitiv

### Prestanda
- **Backend**: <200ms svarstid, <500MB minne
- **Frontend**: <500KB initial bundle, <2MB total
- **Lighthouse score**: Minimum 90

## 🔄 Integration

### Pre-commit Hook
```bash
# Lägg till i .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: quality-control
        name: GastroPartner Quality Control
        entry: ./start_quality_control.sh
        args: ['validate']
        language: system
        pass_filenames: true
```

### IDE Integration
Systemet kan integreras med VS Code genom port 3001 för realtids-feedback.

### GitHub Actions
```yaml
- name: Quality Control
  run: ./start_quality_control.sh all
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 📊 Rapporter

### Console Output
- ✅/❌ Status per fil
- 📊 Sammanfattningstabell (Errors/Warnings/Info)
- 💡 Konkreta fixförslag med kodexempel
- ⏱️ Prestanda- och cache-statistik

### Change Pattern Analysis
- 🔄 Mest ändrade filer
- 🚨 Filer med låg framgångsgrad
- 📈 Valideringsstatistik per filtyp
- ⚡ Genomsnittlig valideringstid

## 🐛 Felsökning

### Vanliga Problem
1. **"OPENAI_API_KEY not set"**: Sätt miljövariabeln eller lägg till i .env.development
2. **"Error initializing agents"**: Kontrollera API-nyckel och internetanslutning  
3. **"Invalid target"**: Använd absoluta sökvägar för filer utanför arbetskatalogen
4. **"AI analysis failed"**: Nätverksfel eller API-begränsning, systemet fortsätter med pattern-validering

### Debug Mode
För detaljerad debugging, kör med verbose output:
```bash
PYTHONPATH=. python -v quality-control/main.py validate file.py
```

## 🤝 Bidrag

För att lägga till nya valideringsregler eller agenter:

1. **Nya Patterns**: Lägg till i `config/validation_rules.yaml`
2. **AI-prompts**: Uppdatera system prompts i agent-klasserna  
3. **Nya Agenter**: Skapa ny agent-klass som implementerar `validate()`-metoden
4. **Tester**: Lägg till test-filer i `quality-control/tests/`

## 📞 Support

För frågor om quality control systemet:
- Kolla loggarna i console output
- Använd `status`-kommandot för systemhälsa  
- Kontrollera cache med `patterns`-kommandot
- Se detaljerade fel-meddelanden i validation results

---

**Utvecklat för GastroPartner** - Säkerhet och kvalitet i fokus för multi-tenant SaaS 🔐