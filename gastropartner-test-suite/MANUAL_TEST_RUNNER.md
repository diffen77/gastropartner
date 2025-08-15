# GastroPartner Manual Test Runner

🚀 **Nu kan du köra alla tester med en enkel knapp!**

Detta dokument beskriver hur du använder den nya manuella testkörningsfunktionen som låter dig:
- Köra alla tester med en klick
- Följa testframsteg i realtid
- Se resultat direkt i dashboard
- Kontrollera att dina förändringar inte förstört andra funktioner

## 🎯 Snabbstart

### Alternativ 1: Web Dashboard (Rekommenderat)
```bash
# Starta dashboard och API server
./start_dashboard.sh

# Öppna dashboard i webbläsare
open http://localhost:8080
```

### Alternativ 2: Manuell köring
```bash
# Interaktiv testkörning
python run_manual_tests.py

# Eller direkt kommandorad
python run_tests.py --suite full --env local --headless
```

### Alternativ 3: Docker (Komplett miljö)
```bash
# Starta hela testmiljön med Docker
docker-compose up -d test-api test-dashboard

# Dashboard: http://localhost:8081
# API: http://localhost:5001
```

## 🖱️ Använda Web Dashboard

1. **Starta dashboarden**
   ```bash
   ./start_dashboard.sh
   ```

2. **Öppna i webbläsare**
   - Gå till: http://localhost:8080
   - Dashboard laddas automatiskt

3. **Kör tester**
   - Välj testsvit (fullständig, smoke tests, etc.)
   - Välj miljö (local, staging, production)  
   - Klicka "🏃‍♂️ Kör Tester"

4. **Följ framsteg**
   - Se realtidsframsteg i progress bar
   - Läs testoutput i realtid
   - Få notifiering när testerna är klara

5. **Granska resultat**
   - Automatisk uppdatering av rapporter
   - Länk till detaljerade HTML-rapporter
   - Screenshots från misslyckade tester

## 🛠️ Tillgängliga Testsviter

| Testsvit | Beskrivning | Tid (ca.) |
|----------|-------------|-----------|
| **Fullständig** | Alla tester | 15-30 min |
| **Smoke tests** | Kritiska funktionstester | 3-5 min |
| **Ingredienstester** | CRUD för ingredienser | 2-3 min |
| **Recepttester** | Recepthantering | 3-5 min |
| **Maträttstester** | Menyhantering | 3-5 min |
| **Datavalidering** | Dataintegritetstest | 1-2 min |
| **Visuella tester** | UI/Design regression | 5-10 min |
| **Prestandatester** | Laddningstider, responsivitet | 5-10 min |

## 🌍 Testmiljöer

- **local**: Din lokala utvecklingsmiljö (http://localhost:3000)
- **staging**: Staging server för testing
- **production**: Produktionsmiljö (använd försiktigt!)

## 📊 Resultat och Rapporter

### Efter testkörning får du:
- ✅/❌ Status för varje testmodul
- 📈 HTML-rapporter med detaljerad info
- 📸 Screenshots från misslyckade tester
- 📹 Videos (om aktiverat)
- 📋 Strukturerade JSON-rapporter

### Rapporter sparas i:
```
gastropartner-test-suite/
├── reports/           # HTML & JSON rapporter
├── screenshots/       # Screenshots från fel
└── videos/           # Testvideor (om aktivt)
```

## 🔧 Konfiguration

### Miljövariabler (.env)
```bash
# Test konfiguration
TEST_ENV=local
HEADLESS=true
BROWSER=chromium

# Frontend/Backend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Reporting
GENERATE_REPORT=true
TAKE_SCREENSHOTS=true
RECORD_VIDEO=false

# Performance
PARALLEL_TESTS=1
TEST_TIMEOUT=30000
```

### Anpassa testdata (config/test_data.json)
```json
{
  "users": {
    "admin": {
      "email": "admin@gastropartner.se",
      "password": "test123"
    }
  },
  "test_ingredients": [
    {"name": "Test Potatis", "unit": "kg", "cost": 25.00}
  ]
}
```

## 🚨 Felsökning

### Problem: "API server startade inte"
```bash
# Kontrollera port 5001 är ledig
lsof -i :5001

# Installera dependencies
pip install -r requirements.txt

# Debug mode
python test_api_server.py
```

### Problem: "Tester misslyckas"
1. Kontrollera att frontend/backend körs:
   ```bash
   curl http://localhost:3000  # Frontend
   curl http://localhost:8000/health  # Backend
   ```

2. Granska testloggar:
   ```bash
   tail -f logs/test_*.log
   ```

3. Kör debug mode:
   ```bash
   python run_tests.py --suite smoke --env local --debug
   ```

### Problem: "Dashboard laddas inte"
```bash
# Kontrollera nginx status (Docker)
docker-compose logs test-dashboard

# Eller starta enkel HTTP server
cd dashboard && python -m http.server 8080
```

## 🎪 Avancerad användning

### CI/CD Integration
```bash
# I din CI pipeline
python run_tests.py --suite smoke --env staging --headless --output-dir ci_reports/
```

### Parallell köring (experimentell)
```bash
python run_tests.py --parallel 4 --suite full
```

### Custom browser inställningar
```bash
python run_tests.py --browser firefox --viewport 1366x768
```

### Slack notifieringar
```bash
export SLACK_WEBHOOK="https://hooks.slack.com/..."
python run_tests.py --suite full --notify
```

## 📝 API Endpoints

Om du vill integrera med andra verktyg:

```bash
# Starta tester via API
curl -X POST http://localhost:5001/api/run-tests \
  -H "Content-Type: application/json" \
  -d '{"suite":"smoke","environment":"local"}'

# Kontrollera status
curl http://localhost:5001/api/test-status/{process_id}

# Stoppa tester
curl -X POST http://localhost:5001/api/stop-tests \
  -H "Content-Type: application/json" \
  -d '{"processId":"{process_id}"}'

# Health check
curl http://localhost:5001/health
```

## 🏆 Best Practices

### Utvecklingsworkflow:
1. **Gör dina ändringar** i koden
2. **Kör smoke tests** först (3-5 min)
3. **Om smoke tests OK** → kör fullständig testsvit
4. **Granska rapporter** för eventuella regressioner
5. **Fixa problem** och kör tester igen

### Före deployment:
1. Kör fullständig testsvit mot staging
2. Kontrollera att alla kritiska tester är gröna
3. Granska performance metrics
4. Dokumentera eventuella kända issues

### Kontinuerlig övervakning:
1. Kör smoke tests varje timme (automation)
2. Fullständiga tester nattligt (automation)  
3. Performance tester vid större ändringar
4. Visual regression tests vid UI-ändringar

---

🎉 **Nu kan du köra dina tester med en enkel knapptryckning och hålla koll på kvaliteten i din applikation!**