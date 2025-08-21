# Security Guidelines - Multi-Tenant Data Isolation

## 🚨 CRITICAL SECURITY PRINCIPLES - MULTI-TENANT DATA ISOLATION

**⚠️ NEVER MIX CUSTOMER DATA - THIS IS A MULTI-TENANT SYSTEM**

### 🛡️ MANDATORY Security Rules

**REGEL 1: VARJE ANVÄNDARE MÅSTE HA SIN EGEN ORGANISATION**
- Användare får ALDRIG dela organisation med andra riktiga användare
- Endast utvecklare får använda den dedikerade utvecklingsorganisationen (87654321-4321-4321-4321-210987654321)
- Varje ny användare MÅSTE få sin egen, unika organisation

**REGEL 2: UTVECKLINGSORGANISATION = ENDAST UTVECKLARE**
- Organisation 87654321-4321-4321-4321-210987654321 är ENDAST för utvecklare
- ALDRIG lägg till riktiga användare i utvecklingsorganisationen
- Alla riktiga användare måste ha separata organisationer

**REGEL 3: DATABAS QUERIES MÅSTE FILTRERA PÅ ORGANISATION**
- Alla SELECT queries MÅSTE inkludera organization_id filter
- Använd ALLTID get_user_organization() dependency i API endpoints
- Kontrollera ALLTID att användaren tillhör rätt organisation innan dataåtkomst

**REGEL 4: INGEN DEVELOPMENT TOKEN FALLBACK I PRODUKTION**
- Ta bort alla development token fallbacks från produktionskod
- Kräv giltig JWT autentisering för alla requests
- Implementera proper error handling för autentiseringsfel

**REGEL 5: ALLA NYA FUNKTIONER MÅSTE HA CREATOR TRACKING**
- Alla tabeller MÅSTE ha både organization_id OCH creator_id kolumner
- Vid INSERT: Sätt alltid organization_id från get_user_organization() och creator_id från JWT
- Vid SELECT/UPDATE/DELETE: Filtrera alltid på organization_id
- ALDRIG tillåt cross-organization data access

### 🚨 OBLIGATORISK SÄKERHETSCHECKLISTA FÖR ALLA FUNKTIONER

**🔍 FÖRE utveckling av ANY ny funktion:**
- [ ] Kontrollera att tabeller har organization_id och creator_id kolumner
- [ ] Implementera get_user_organization() dependency i API endpoints
- [ ] Alla queries MÅSTE filtrera på organization_id

**📝 UNDER utveckling:**
- [ ] Alla SELECT queries inkluderar: WHERE organization_id = ?
- [ ] Alla INSERT queries sätter: organization_id, creator_id
- [ ] Alla UPDATE/DELETE queries filtrerar: WHERE organization_id = ? AND [entity]_id = ?
- [ ] JWT autentisering krävs (ingen development bypass)

**✅ FÖRE deployment:**
- [ ] Testa med flera användare/organisationer
- [ ] Verifiera att användare ENDAST ser sin organisations data
- [ ] Kontrollera att inga queries saknar organization_id filter
- [ ] Validera att ingen dataleakage sker mellan organisationer

**❌ FÖRBJUDNA PATTERNS (ALDRIG använda):**
```sql
-- FÖRBJUDET: Query utan organization filter
SELECT * FROM recipes;
SELECT * FROM ingredients;
UPDATE recipes SET name = ? WHERE recipe_id = ?;

-- RÄTT: Alltid filtrera på organisation
SELECT * FROM recipes WHERE organization_id = ?;
SELECT * FROM ingredients WHERE organization_id = ?;
UPDATE recipes SET name = ? WHERE organization_id = ? AND recipe_id = ?;
INSERT INTO recipes (name, organization_id, creator_id) VALUES (?, ?, ?);
```

### 🔍 Security Validation Checklist

Innan ANY kod deployment:
- [ ] Kontrollera att inga nya användare lagts till i utvecklingsorganisationen
- [ ] Verifiera att alla API endpoints filtrerar på organization_id
- [ ] Testa att användare endast kan se sin egen organisations data
- [ ] Kontrollera att inga development bypasses finns i produktionskod
- [ ] Validera att alla nya tabeller har organization_id och creator_id

## 🛡️ Security Best Practices

### Security Guidelines

- Never commit secrets - use environment variables
- Validate all user input with Pydantic
- Use parameterized queries for database operations
- Implement rate limiting for APIs
- Keep dependencies updated with `uv`
- Use HTTPS for all external communications
- Implement proper authentication and authorization

### Example Security Implementation

```python
from passlib.context import CryptContext
import secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)
```

## 🚨 SÄKERHETSLARM - ARCHON TASK PROTOCOL

**VID ALLA SÄKERHETSPROBLEM: SKAPA OMEDELBART ARCHON TASKS**

När du upptäcker säkerhetsproblem (multi-tenant data läckage, autentiseringsfel, privilegiering):
1. **OMEDELBART**: Skapa kritisk Archon task med 🚨 emoji
2. **PRIORITET 90-100**: Sätt task_order högt för akuta säkerhetsproblem  
3. **ASSIGNEE**: AI IDE Agent för omedelbar åtgärd
4. **FEATURE**: "security" för alla säkerhetsrelaterade tasks
5. **DETALJERAD BESKRIVNING**: Inkludera SQL queries, påverkan, och åtgärder

**EXEMPEL SÄKERHETSTASK:**
```
Title: "🚨 KRITISKT: Isolera användar X från dev-organisation"
Description: "AKUT säkerhetsfix - användare kan se andras data..."
Task_order: 100
Feature: "security"
Assignee: "AI IDE Agent"
```