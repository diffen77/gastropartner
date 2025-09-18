# Recipe Menu Wizard E2E Tests

Omfattande end-to-end tester för RecipeMenuWizard-komponenten som säkerställer att hela skapandeflödet fungerar korrekt från användarens perspektiv.

## 📁 Teststruktur

```
e2e/
├── recipe-menu-wizard.spec.ts           # Huvudtestfil med omfattande testscenarier
├── recipe-menu-wizard-simplified.spec.ts # Förenklad testfil med helper-funktioner
├── wizard-test.config.ts                 # Specialiserad konfiguration för wizard-tester
├── helpers/
│   └── wizard-helpers.ts                 # Återanvändbara test-utilities
└── README-wizard-tests.md               # Denna fil
```

## 🎯 Testomfattning

### Huvudfunktionalitet
- ✅ **Komplett receptskapande** - Hela flödet från start till avslut
- ✅ **Komplett maträttsskapande** - Inklusive försäljningsinställningar
- ✅ **Stegnavigation** - Framåt, bakåt och direkthopp mellan steg
- ✅ **Formulärvalidering** - Obligatoriska fält och datavalidering
- ✅ **Kostnadsberäkningar** - Automatiska kostnader och marginalberäkningar

### Felhantering
- ✅ **API-fel** - Graceful hantering av server-fel
- ✅ **Nätverksfel** - Offline/timeout-scenarier
- ✅ **Valideringsfel** - Inkorrekt användarinput
- ✅ **Edge cases** - Extremvärden och specialfall

### Användbarhet
- ✅ **Responsiv design** - Desktop, tablet och mobil
- ✅ **Tillgänglighet** - WCAG-compliance och tangentbordsnavigation
- ✅ **Prestanda** - Laddningstider och responsivitet
- ✅ **Internationalisering** - Svenska språkstöd

### Avancerade scenarier
- ✅ **Stora ingredienslistor** - Prestanda med många ingredienser
- ✅ **Specialtecken** - Unicode, emojis och symboler
- ✅ **Decimalvärden** - Korrekta beräkningar med decimaler
- ✅ **Browser-kompatibilitet** - Chrome, Firefox, Safari

## 🚀 Körning av tester

### Alla wizard-tester
```bash
# Kör alla wizard-tester med standardkonfiguration
npx playwright test recipe-menu-wizard

# Kör med specifik wizard-konfiguration
npx playwright test --config=gastropartner-test-suite/tests/e2e/wizard-test.config.ts

# Kör endast förenklad testsvit
npx playwright test recipe-menu-wizard-simplified.spec.ts
```

### Specifika testgrupper
```bash
# Endast receptskapande
npx playwright test recipe-menu-wizard.spec.ts --grep "Recipe Creation Flow"

# Endast maträttsskapande
npx playwright test recipe-menu-wizard.spec.ts --grep "Menu Item Creation Flow"

# Endast felhantering
npx playwright test recipe-menu-wizard.spec.ts --grep "Error Handling"

# Endast tillgänglighet
npx playwright test recipe-menu-wizard.spec.ts --grep "Accessibility"
```

### Debug-läge
```bash
# Kör med visuell debugger
npx playwright test recipe-menu-wizard.spec.ts --debug

# Kör med headed browser
npx playwright test recipe-menu-wizard.spec.ts --headed

# Kör med slow motion
npx playwright test recipe-menu-wizard.spec.ts --headed --slowMo=1000
```

### Mobile testing
```bash
# Specifik mobil-testning
npx playwright test --project=wizard-mobile-chrome

# Olika enheter
npx playwright test --project="Mobile Chrome" recipe-menu-wizard-simplified.spec.ts
npx playwright test --project="Mobile Safari" recipe-menu-wizard-simplified.spec.ts
```

## 🧪 Test Helpers

### Användning av wizard-helpers.ts

Helper-funktionerna gör det enkelt att skriva nya tester:

```typescript
import {
  setupWizardTest,
  createRecipeFlow,
  WizardStepData
} from './helpers/wizard-helpers';

test('my custom wizard test', async ({ page }) => {
  await setupWizardTest(page);

  const myData: WizardStepData = {
    basicInfo: { name: 'Test Recipe', servings: 4 },
    ingredients: [{ ingredientId: 1, quantity: 2, unit: 'kg' }]
  };

  await createRecipeFlow(page, myData);
});
```

### Tillgängliga helper-funktioner

#### Setup & Navigation
- `setupWizardTest(page)` - Grundkonfiguration för alla tester
- `startWizard(page)` - Starta wizard från receptsidan
- `selectCreationType(page, type)` - Välj recept eller maträtt

#### Steghantering
- `fillBasicInfo(page, data)` - Fyll grundinformation
- `addIngredients(page, ingredients)` - Lägg till ingredienser
- `fillPreparation(page, data)` - Fyll tillagningsinstruktioner
- `fillSalesSettings(page, data)` - Konfigurera försäljningsinställningar
- `completeWizard(page, expectedData)` - Slutför och verifiera

#### Kompletta flöden
- `createRecipeFlow(page, data)` - Komplett receptskapande
- `createMenuItemFlow(page, data)` - Komplett maträttsskapande

#### Testing & Validation
- `verifyWizardAccessibility(page)` - Tillgänglighetstester
- `testKeyboardNavigation(page)` - Tangentbordsnavigation
- `verifyMobileLayout(page)` - Mobil responsivitet
- `measureWizardPerformance(page)` - Prestanda-mätningar

## 📊 Testreporter

### HTML Report
```bash
npx playwright show-report gastropartner-test-suite/reports/wizard-report
```

### JSON Results
```bash
cat gastropartner-test-suite/reports/wizard-test-results.json | jq '.suites[0].specs'
```

### CI/CD Integration
Testerna är konfigurerade för CI/CD med:
- Automatiska retries vid fel
- Screenshot och video vid misslyckanden
- JSON-rapporter för integration med andra system

## 🐛 Debugging & Troubleshooting

### Vanliga problem

#### Test timeouts
```bash
# Öka timeout för långsamma system
PLAYWRIGHT_TIMEOUT=120000 npx playwright test recipe-menu-wizard.spec.ts
```

#### Element hittades inte
```bash
# Kör med debug för att se vad som händer
npx playwright test recipe-menu-wizard.spec.ts --debug --grep "failing test name"
```

#### API-mocking fungerar inte
- Kontrollera att URL-mönster matchar i route handlers
- Verifiera att mock-data har rätt struktur
- Använd `page.route` debugger för att se vad som fångas

#### Mobila tester misslyckas
- Kontrollera viewport-inställningar
- Verifiera touch targets storlek
- Testa med olika mobila enheter

### Debug-verktyg

#### Playwright Inspector
```bash
npx playwright test --debug recipe-menu-wizard.spec.ts
```

#### Trace Viewer
```bash
npx playwright show-trace gastropartner-test-suite/reports/test-results/[test-name]/trace.zip
```

#### Console logs
```javascript
page.on('console', msg => console.log('Browser:', msg.text()));
```

## 📈 Prestanda-benchmarks

### Förväntade prestanda-mål
- **Wizard laddning**: < 3 sekunder
- **Stegövergångar**: < 1 sekund
- **Formulärvalidering**: < 500ms
- **API-anrop**: < 2 sekunder

### Prestanda-mätning
```typescript
const performance = await measureWizardPerformance(page);
console.log(`Load time: ${performance.loadTime}ms`);
```

## 🔄 Kontinuerlig förbättring

### Lägg till nya tester
1. Skapa test i `recipe-menu-wizard.spec.ts` för omfattande scenarier
2. Använd `recipe-menu-wizard-simplified.spec.ts` för snabba smoke tests
3. Uppdatera helper-funktioner vid behov
4. Dokumentera nya testfall här

### Test maintenance
- Kör tester regelbundet för att upptäcka regressions
- Uppdatera mock-data när API:er ändras
- Justera selectors vid UI-förändringar
- Optimera prestanda-tester baserat på faktisk prestanda

### Rapportering
- Inkludera test-resultat i PR reviews
- Övervaka trend för test-prestanda
- Använd failed test-screenshots för buggrapporter

## 🏷️ Testcategorier

### Tags för filtrering
```bash
# Smoke tests (snabba, viktiga funktioner)
npx playwright test --grep "@smoke"

# Regression tests (efter bug fixes)
npx playwright test --grep "@regression"

# Performance tests
npx playwright test --grep "@performance"

# Accessibility tests
npx playwright test --grep "@a11y"
```

Testerna är omfattande och täcker alla kritiska användarscenarier för RecipeMenuWizard-komponenten. De säkerställer att wizarden fungerar korrekt i alla webbläsare och enheter, hanterar fel gracefully och tillhandahåller en tillgänglig användarupplevelse.