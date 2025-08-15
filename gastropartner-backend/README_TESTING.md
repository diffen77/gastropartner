# Test Reporting for GastroPartner Backend

Detta dokument beskriver hur testsystemet är konfigurerat för att generera rapporter även när tester misslyckas.

## Problem som lösts

Tidigare stannades testkörningen när tester misslyckades utan att generera strukturerade rapporter. Nu genereras alltid:
- JUnit XML-rapporter (för CI/CD-integration)
- HTML-täckningsrapporter 
- XML-täckningsrapporter
- JSON-täckningsrapporter

## Användning

### Grundläggande testkommandon

```bash
# Kör alla tester med standardrapportering
make test

# Kör tester med fullständig rapportgenerering (rekommenderat)
make test-report

# Kör endast specifika tester med rapporter
uv run python run_tests.py path/to/test_file.py

# Visa alla tillgängliga kommandon
make help
```

### Direkta pytest-kommandon

```bash
# Grundläggande testkörning (använder konfiguration från pyproject.toml)
uv run pytest

# Snabb testkörning utan täckningsanalys
make test-fast

# Kör endast tidigare misslyckade tester
make test-failing

# Kör endast nya/modifierade tester
make test-new
```

## Genererade rapporter

Efter testkörning skapas följande rapporter i `reports/`-katalogen:

### JUnit XML (`reports/junit/pytest.xml`)
- Strukturerad XML-rapport för CI/CD-system
- Innehåller testresultat, tidsdata och felmeddelanden
- Kompatibel med Jenkins, GitHub Actions, etc.

### HTML-täckningsrapport (`reports/htmlcov/index.html`)
- Interaktiv webbrapport med täckningsdata
- Visar vilka rader som testas/inte testas
- Öppnas i webbläsare för enkel granskning

### XML-täckningsrapport (`reports/coverage.xml`)
- Strukturerad XML-rapport för täckningsdata
- Används av externa verktyg som SonarQube, Codecov

### JSON-täckningsrapport (`reports/coverage.json`)
- Maskinläsbar täckningsdata
- För anpassade verktyg och analyser

## Konfiguration

### pyproject.toml

Testkonfigurationen är definierad i `[tool.pytest.ini_options]`:

```toml
[tool.pytest.ini_options]
testpaths = ["src/gastropartner/tests"]
python_files = ["test_*.py", "*_test.py"]
asyncio_mode = "auto"
addopts = [
    "--strict-markers",
    "--strict-config", 
    "--verbose",
    "--junit-xml=reports/junit/pytest.xml",
    "--junit-prefix=gastropartner",
    "--cov=src/gastropartner",
    "--cov-report=html:reports/htmlcov",
    "--cov-report=xml:reports/coverage.xml",
    "--cov-report=json:reports/coverage.json", 
    "--cov-report=term-missing",
    "--no-cov-on-fail",  # Viktigt: generera rapporter även vid testfel
]
```

### run_tests.py

Anpassad testkörare som:
- Säkerställer att rapporter genereras även vid misslyckade tester
- Ger tydlig feedback om rapporternas placering
- Hanterar fel gracefully
- Visar länkar till HTML-rapporter

### Makefile

Fördefinierade kommandon för vanliga testscenarier:
- `test-report`: Fullständig rapportgenerering
- `test-fast`: Snabb testkörning
- `test-watch`: Kontinuerlig testövervakning
- `coverage`: Endast täckningsanalys

## CI/CD-integration

### GitHub Actions

Rapporterna kan användas i GitHub Actions:

```yaml
- name: Run tests with reports
  run: make test-report

- name: Upload test reports
  uses: actions/upload-artifact@v3
  if: always()  # Viktigt: ladda upp även vid misslyckade tester
  with:
    name: test-reports
    path: reports/

- name: Publish test results
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Test Results
    path: reports/junit/pytest.xml
    reporter: java-junit
```

### Andra CI-system

JUnit XML-formatet stöds av de flesta CI-system:
- Jenkins: JUnit Plugin
- GitLab CI: `artifacts:reports:junit`
- CircleCI: `store_test_results`

## Felsökning

### Inga rapporter genereras

1. Kontrollera att `reports/`-katalogen existerar:
   ```bash
   mkdir -p reports/{junit,htmlcov}
   ```

2. Kör med verbose-flagga för att se vad som händer:
   ```bash
   uv run pytest -v --tb=long
   ```

### Täckningsdata saknas

1. Säkerställ att `--no-cov-on-fail` är aktiverat
2. Kontrollera att testerna körs från rätt katalog
3. Verifiera att `src/gastropartner` är korrekt sökväg

### Rättighetsfel

```bash
# Sätt rätt rättigheter på run_tests.py
chmod +x run_tests.py

# Sätt rättigheter på reports-katalogen
chmod -R 755 reports/
```

## Bästa praxis

1. **Använd alltid `make test-report`** för fullständig rapportgenerering
2. **Granska HTML-täckningsrapporten** regelbundet för att identifiera otestade områden
3. **Integrera i CI/CD** för automatisk rapportering
4. **Arkivera rapporter** för historisk analys och trendövervakning
5. **Övervaka testtider** genom JUnit-rapporternas tidsdata

## Exempel på användning

```bash
# Utveckling: kör alla tester med rapporter
make test-report

# CI/CD: kör specifika tester
uv run python run_tests.py src/gastropartner/tests/test_auth.py

# Debugging: kör med extra verbose output
uv run pytest -vvv --tb=long --no-cov

# Performance: snabb testkörning utan täckning
make test-fast
```