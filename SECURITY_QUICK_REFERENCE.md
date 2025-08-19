# 🛡️ SÄKERHETS QUICK REFERENCE - MULTI-TENANT ISOLATION

**ANVÄND DETTA KORT VID ALLA FUNKTIONSUTVECKLINGAR**

## 🚨 KRITISKA REGLER - INGA UNDANTAG

### ✅ ALLTID GÖR:
```sql
-- ✅ RÄTT: Filtrera alltid på organisation
SELECT * FROM recipes WHERE organization_id = ?;
UPDATE recipes SET name = ? WHERE organization_id = ? AND recipe_id = ?;
INSERT INTO recipes (name, organization_id, creator_id) VALUES (?, ?, ?);
```

### ❌ ALDRIG GÖR:
```sql
-- ❌ FÖRBJUDET: Query utan organisation filter
SELECT * FROM recipes;
UPDATE recipes SET name = ? WHERE recipe_id = ?;
INSERT INTO recipes (name) VALUES (?);
```

## 📋 SNABB CHECKLISTA

### 🔍 Före utveckling:
- [ ] Tabellen har `organization_id` och `creator_id` kolumner
- [ ] API endpoint använder `get_user_organization()` dependency
- [ ] JWT autentisering implementerad (ingen dev bypass)

### 📝 Under utveckling:
- [ ] Alla queries filtrerar på `organization_id`
- [ ] INSERT sätter både `organization_id` och `creator_id`
- [ ] Ingen cross-organization data access

### ✅ Före deployment:
- [ ] Testat med flera användare/organisationer
- [ ] Verifierat att användare ENDAST ser sin data
- [ ] Ingen dataleakage mellan organisationer

## 🎯 SNABBTEST

```sql
-- Test 1: Kontrollera att user endast ser sin data
SELECT COUNT(*) FROM recipes WHERE organization_id = 'USER_ORG_ID';

-- Test 2: Kontrollera att user INTE ser andras data  
SELECT COUNT(*) FROM recipes WHERE organization_id != 'USER_ORG_ID';
-- Ska returnera 0 för användaren

-- Test 3: Verifiera ingen data i dev-org
SELECT COUNT(*) FROM recipes WHERE organization_id = '87654321-4321-4321-4321-210987654321';
-- Ska ALLTID vara 0
```

## 🚫 DEV-ORGANISATION REGLER

**Organisation `87654321-4321-4321-4321-210987654321` är ENDAST för utvecklare**

- ❌ ALDRIG lägg till riktiga användare
- ❌ ALDRIG låt produktionsdata ligga kvar här
- ✅ ENDAST använd för utveckling och tester

---

**🚨 VID BROTT MOT DESSA REGLER = KRITISK SÄKERHETSRISK**

**Spara detta kort och använd vid varje funktion!**