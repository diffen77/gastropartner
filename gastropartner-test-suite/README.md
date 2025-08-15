# GastroPartner Automated Test Suite

En omfattande, Docker-baserad testsvit för automatiserad testning av alla funktioner i GastroPartner-applikationen.

## 🚀 Översikt

Denna testsvit är byggd för att automatiskt testa alla aspekter av GastroPartner:

- **Automatisk datainmatning**: Lägger till ingredienser, bygger recept och skapar maträtter
- **Matematisk validering**: Verifierar att alla beräkningar är korrekta (1+1=2)
- **Design compliance**: Kontrollerar att UI följer design guidelines
- **Prestanda övervakning**: Mäter laddningstider och responsivitet
- **Flermiljöstöd**: Testar mot local, staging och production

## 📁 Projektstruktur

```
gastropartner-test-suite/
├── config/                     # Konfigurationsfiler
│   ├── environments.json       # Miljöspecifika inställningar
│   └── test_data.json         # Svenska testdata
├── tests/                      # Testmoduler
│   ├── core/                  # Kärnfunktionalitet
│   │   ├── config.py         # Konfigurationshantering
│   │   ├── test_engine.py    # Huvudtestmotor
│   │   ├── reporter.py       # Testrapportering
│   │   └── utils.py          # Hjälpfunktioner
│   ├── e2e/                  # End-to-End tester
│   │   ├── ingredients_test.py
│   │   ├── recipes_test.py
│   │   └── menu_items_test.py
│   ├── data_validation/      # Datavalideringstester
│   │   └── calculator_test.py
│   └── visual/               # Visuella tester
│       └── design_test.py
├── scripts/                   # Körningsskript
│   ├── run_continuous_monitoring.py
│   └── ci_integration.py
├── run_tests.py              # Huvudkörningsskript
├── Dockerfile                # Docker container definition
├── docker-compose.yml       # Docker orchestration
└── requirements.txt          # Python dependencies
```

## 🛠️ Installation & Setup

### Förutsättningar

- Docker & Docker Compose
- Python 3.9+ (för lokal utveckling)
- Git

**ARM64 Kompatibilitet**: Testsviten är optimerad för ARM64 (Apple Silicon). Locust performance testing är inaktiverat för ARM64 men kan aktiveras för x86_64 builds.

### Snabb start med Docker

```bash
# Klona repository
git clone <repository-url>
cd gastropartner-test-suite

# Bygg och starta testsviten
docker-compose up --build

# Kör tester mot lokal miljö
docker-compose run test-runner python3 run_tests.py --environment local

# Kör tester mot staging
docker-compose run test-runner python3 run_tests.py --environment staging
```

### Lokal utveckling

```bash
# Installera dependencies
pip install -r requirements.txt

# Installera Playwright browsers
playwright install

# Kör tester
python3 run_tests.py --environment local
```

## 🎯 Testtyper

### 1. End-to-End Tester (E2E)

**Ingredienstester** (`ingredients_test.py`):
- Lägg till enskilda ingredienser
- Batch-tillägg av ingredienser
- Formulärvalidering
- Redigering och borttagning
- Kategorifiltrering
- Sökfunktionalitet
- Freemium-gränser
- Kostnadsberäkningar

**Recepttester** (`recipes_test.py`):
- Skapa recept med ingredienser
- Kostnadsbereäkningar per portion
- Redigera befintliga recept
- Ingrediensval och mängder
- Portionsberäkningar

**Maträttstester** (`menu_items_test.py`):
- Skapa maträtter med recept
- Prisberäkningar och marginaler
- Kategorihantering
- Analytics och sammanfattningsdata

### 2. Datavalideringstester

**Kalkyltester** (`calculator_test.py`):
- Grundläggande matematik (addition, subtraktion, etc.)
- Procentberäkningar
- Marginalberäkningar
- Valutaformatering
- Edge cases (division med noll, stora tal)

### 3. Visuella Design Tester

**Design Compliance** (`design_test.py`):
- Färgkonsistens
- Typografi compliance
- Spacing och layout
- Komponentstilning
- Responsiv design
- Tillgänglighet (WCAG)
- Button states och interaktioner

## 🏃‍♂️ Körningsalternativ

### Grundläggande körning

```bash
# Kör alla tester
python3 run_tests.py

# Specifik miljö
python3 run_tests.py --environment staging

# Specifika testmoduler
python3 run_tests.py --modules ingredients,recipes

# Headless mode (standard i Docker)
python3 run_tests.py --headless

# Med video inspelning
python3 run_tests.py --record-video
```

### Smoke Tests (snabba)

```bash
# Enbart kritiska tester
python3 run_tests.py --smoke-only

# Specifika smoke tests  
python3 run_tests.py --smoke-tests auth,navigation,api
```

### Avancerade alternativ

```bash
# Parallell körning
python3 run_tests.py --parallel --workers 3

# Retry vid fel
python3 run_tests.py --retry-failed --retry-count 3

# Performance tester
python3 run_tests.py --include-performance

# Visual regression tester
python3 run_tests.py --include-visual
```

## 📊 Rapporter

Testsviten genererar omfattande rapporter:

### HTML Rapport
- Visuellt dashboard med sammanfattning
- Detaljerade resultat per testmodul
- Screenshots vid fel
- Prestanda metrics

### JSON Rapport
- Strukturerad data för CI/CD integration
- Detaljerade testresultat
- Metadata och konfigurationsinformation

### Kontinuerlig Övervakning
```bash
# Starta kontinuerlig övervakning
python3 scripts/run_continuous_monitoring.py --environment staging

# Konfigurera intervaller
python3 scripts/run_continuous_monitoring.py --smoke-interval 10 --full-interval 30
```

## 🔧 Konfiguration

### Miljöinställningar (`config/environments.json`)

```json
{
  "environments": {
    "local": {
      "frontend_url": "http://localhost:3000",
      "backend_url": "http://localhost:8000",
      "development_mode": true,
      "test_data_cleanup": true
    },
    "staging": {
      "frontend_url": "https://staging.gastropartner.se",
      "backend_url": "https://api-staging.gastropartner.se",
      "auth_required": true,
      "screenshot_on_failure": true
    },
    "production": {
      "frontend_url": "https://gastropartner.se",
      "backend_url": "https://api.gastropartner.se",
      "read_only_mode": true,
      "test_data_cleanup": false
    }
  }
}
```

### Testdata (`config/test_data.json`)

Svensk testdata för:
- Ingredienser med svenska namn och kategorier
- Recept med svenska beskrivningar
- Maträtter med svenska namn och priser
- Förväntade beräkningsresultat

## 🚨 CI/CD Integration

### GitHub Actions

```bash
# Kör CI pipeline
python3 scripts/ci_integration.py --environment staging --test-types smoke,e2e

# Med specifika inställningar
python3 scripts/ci_integration.py --fail-fast --json-output
```

### Output Formater

- **JUnit XML**: För CI system som Jenkins, GitHub Actions
- **JSON**: För custom CI integrationer
- **Console**: Human-readable output

### Exit Codes

- `0`: Alla tester godkända
- `1`: Testfel detekterat
- `2`: Setup/konfigurationsfel
- `3`: Konfigurationsfel

## 📈 Övervakning & Alerting

### Kontinuerlig Övervakning

```bash
# Starta övervakning
python3 scripts/run_continuous_monitoring.py

# Med custom inställningar
python3 scripts/run_continuous_monitoring.py \
  --environment staging \
  --smoke-interval 15 \
  --full-interval 60
```

### Alert Konfiguration

```json
{
  "alert_thresholds": {
    "failure_rate": 0.1,     // 10% failure rate triggar alert
    "response_time": 5000    // 5s responstid triggar alert
  }
}
```

### Alert Destinationer

- Loggar till `monitoring_reports/alerts.jsonl`
- Console utskrifter
- Utökningsbar för email/Slack/SMS

## 🐛 Felsökning

### Vanliga Problem

**1. Authentication Failure**
```bash
# Kontrollera credentials i config
# Kör i debug mode
python3 run_tests.py --debug --environment local
```

**2. Element Not Found**
```bash
# Öka timeouts
python3 run_tests.py --timeout 30000

# Kör med screenshots
python3 run_tests.py --screenshot-on-failure
```

**3. Docker Issues**
```bash
# Rebuild container
docker-compose down
docker-compose up --build --force-recreate

# Kontrollera logs
docker-compose logs test-runner
```

### Debug Mode

```bash
# Aktivera debug logging
python3 run_tests.py --debug

# Kör med visible browser
python3 run_tests.py --no-headless

# Ta screenshots vid varje steg
python3 run_tests.py --screenshot-all
```

## 📚 Utveckling & Utökning

### Lägg till nya tester

1. Skapa testfil i lämplig modul (`tests/e2e/`, `tests/data_validation/`, etc.)
2. Implementera testklass som följer befintliga mönster
3. Registrera i `test_engine.py`
4. Uppdatera konfiguration vid behov

### Test Utilities

```python
from tests.core.utils import TestUtils, TestDataGenerator

# Använd hjälpfunktioner
utils = TestUtils(page, logger)
await utils.cleanup_test_data("local")

# Generera testdata
test_ingredients = TestDataGenerator.generate_ingredient_data(5)
```

### Custom Rapporter

```python
from tests.core.reporter import TestReporter

reporter = TestReporter(output_dir, environment, config)
await reporter.generate_final_report(results)
```

## 📋 Checklista för Deployment

- [ ] Konfigurera miljöspecifika URLs
- [ ] Sätt upp test accounts/credentials
- [ ] Konfigurera CI/CD pipeline
- [ ] Testa alert funktionalitet
- [ ] Verifiera rapport generation
- [ ] Validera cleanup funktioner
- [ ] Kontrollera prestanda thresholds

## 🤝 Bidrag

1. Fork repository
2. Skapa feature branch
3. Implementera tester enligt befintliga mönster
4. Lägg till svenska kommentarer och beskrivningar
5. Testa lokalt innan PR
6. Skicka Pull Request

## 📞 Support

- **Logs**: Kontrollera `reports/` och `monitoring_reports/`
- **Debug**: Använd `--debug` flaggan
- **Screenshots**: Automatiskt vid fel, manuellt med `--screenshot-all`
- **Video**: Aktivera med `--record-video`

---

**Utvecklad för GastroPartner** - Automatiserad kvalitetssäkring av alla applikationsfunktioner med fokus på svensk användarupplevelse och matematisk precision.