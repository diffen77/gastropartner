# 🛡️ MULTI-TENANT SECURITY IMPLEMENTATION GUIDE

**För GastroPartner utvecklare - OBLIGATORISK läsning**

## 🚨 GRUNDLÄGGANDE SÄKERHETSREGLER

### REGEL 1: VARJE ANVÄNDARE MÅSTE HA SIN EGEN ORGANISATION
```python
# ✅ RÄTT: Skapa ny organisation för varje användare
org_response = supabase.table("organizations").insert({
    "name": f"{user.email}'s Organization",
    "owner_id": str(user.id),
}).execute()

# ❌ FEL: Lägg ALDRIG till riktiga användare i utvecklingsorganisationen
# UTVECKLINGSORGANISATION = ENDAST UTVECKLARE!
```

### REGEL 2: ALLA DATABAS QUERIES MÅSTE FILTRERA PÅ ORGANISATION
```python
# ✅ RÄTT: Filtrera ALLTID på organization_id
response = supabase.table("recipes").select("*").eq(
    "organization_id", str(organization_id)
).execute()

# ❌ FEL: Query utan organisation filter
response = supabase.table("recipes").select("*").execute()
```

### REGEL 3: ALLA API ENDPOINTS MÅSTE HA AUTENTISERING
```python
# ✅ RÄTT: Kräv autentisering och organisation
@router.get("/recipes")
async def list_recipes(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
):

# ❌ FEL: Endpoint utan autentisering
@router.get("/recipes")
async def list_recipes():
```

### REGEL 4: ALLA INSERT OPERATIONER MÅSTE SÄTTA ORGANISATION OCH SKAPARE
```python
# ✅ RÄTT: Sätt organisation och skapare
response = supabase.table("recipes").insert({
    "organization_id": str(organization_id),
    "creator_id": str(current_user.id),
    "name": recipe_data.name,
}).execute()

# ❌ FEL: Insert utan organisation tracking
response = supabase.table("recipes").insert({
    "name": recipe_data.name,
}).execute()
```

### REGEL 5: INGA DEVELOPMENT BYPASSES I PRODUKTION
```python
# ✅ RÄTT: Använd miljövariabler
if settings.ENVIRONMENT == "development":
    # Development logic here

# ❌ FEL: Hårdkodade development user IDs
if str(user_id) == "12345678-1234-1234-1234-123456789012":
    # Development bypass - REMOVE THIS!
```

## 🔧 IMPLEMENTATION TEMPLATES

### Template 1: API Endpoint med Säkerhet
```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.models import User

router = APIRouter(prefix="/your-endpoint", tags=["your-tag"])

@router.get("/")
async def list_items(
    current_user: User = Depends(get_current_active_user),        # ✅ Autentisering
    organization_id: UUID = Depends(get_user_organization),      # ✅ Organisation
    supabase: Client = Depends(get_supabase_client),
) -> list[YourModel]:
    """List items för användarens organisation."""
    
    query = supabase.table("your_table").select("*").eq(
        "organization_id", str(organization_id)                   # ✅ Filtrera på organisation
    )
    
    response = query.execute()
    return [YourModel(**item) for item in response.data]

@router.post("/")
async def create_item(
    item_data: YourCreateModel,
    current_user: User = Depends(get_current_active_user),        # ✅ Autentisering
    organization_id: UUID = Depends(get_user_organization),      # ✅ Organisation
    supabase: Client = Depends(get_supabase_client),
) -> YourModel:
    """Skapa nytt item."""
    
    response = supabase.table("your_table").insert({
        "organization_id": str(organization_id),                  # ✅ Sätt organisation
        "creator_id": str(current_user.id),                      # ✅ Sätt skapare
        "name": item_data.name,
        # ... övriga fält
    }).execute()
    
    return YourModel(**response.data[0])

@router.get("/{item_id}")
async def get_item(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),        # ✅ Autentisering
    organization_id: UUID = Depends(get_user_organization),      # ✅ Organisation
    supabase: Client = Depends(get_supabase_client),
) -> YourModel:
    """Hämta specifikt item."""
    
    response = supabase.table("your_table").select("*").eq(
        "item_id", str(item_id)
    ).eq(
        "organization_id", str(organization_id)                   # ✅ Filtrera på organisation
    ).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    return YourModel(**response.data[0])

@router.put("/{item_id}")
async def update_item(
    item_id: UUID,
    update_data: YourUpdateModel,
    current_user: User = Depends(get_current_active_user),        # ✅ Autentisering
    organization_id: UUID = Depends(get_user_organization),      # ✅ Organisation
    supabase: Client = Depends(get_supabase_client),
) -> YourModel:
    """Uppdatera item."""
    
    # Verifiera att item finns och tillhör användaren
    existing = await get_item(item_id, current_user, organization_id, supabase)
    
    response = supabase.table("your_table").update({
        "name": update_data.name,
        "updated_at": "now()",
        # ... övriga fält
    }).eq("item_id", str(item_id)).eq(
        "organization_id", str(organization_id)                   # ✅ Filtrera på organisation
    ).execute()
    
    return YourModel(**response.data[0])

@router.delete("/{item_id}")
async def delete_item(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),        # ✅ Autentisering
    organization_id: UUID = Depends(get_user_organization),      # ✅ Organisation
    supabase: Client = Depends(get_supabase_client),
) -> dict[str, str]:
    """Ta bort item (soft delete)."""
    
    # Verifiera att item finns och tillhör användaren
    existing = await get_item(item_id, current_user, organization_id, supabase)
    
    response = supabase.table("your_table").update({
        "is_active": False,
        "updated_at": "now()"
    }).eq("item_id", str(item_id)).eq(
        "organization_id", str(organization_id)                   # ✅ Filtrera på organisation
    ).execute()
    
    return {"message": "Item deleted successfully"}
```

### Template 2: Datamodell med Organisation Support
```python
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field
from gastropartner.core.models import TenantMixin

class YourModel(TenantMixin, BaseModel):
    """Din datamodell med organisation support."""
    
    item_id: UUID = Field(default_factory=uuid4)
    organization_id: UUID                                          # ✅ Organisation tracking
    creator_id: UUID                                              # ✅ Creator tracking
    name: str
    description: str | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        from_attributes = True

class YourCreateModel(BaseModel):
    """Create model - organisationer sätts automatiskt."""
    
    name: str
    description: str | None = None

class YourUpdateModel(BaseModel):
    """Update model - alla fält optional."""
    
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
```

### Template 3: Database Migration med Organisation Support
```sql
-- Skapa tabell med organisation support
CREATE TABLE your_table (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index för prestanda
CREATE INDEX idx_your_table_organization_id ON your_table(organization_id);
CREATE INDEX idx_your_table_creator_id ON your_table(creator_id);
CREATE INDEX idx_your_table_is_active ON your_table(is_active);

-- RLS (Row Level Security) policies
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Policy: Användare kan endast se sin organisations data
CREATE POLICY "Users can only access their organization's data" 
ON your_table FOR ALL 
USING (organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
));

-- Policy: Användare kan endast skapa data för sin organisation
CREATE POLICY "Users can only create data for their organization" 
ON your_table FOR INSERT 
WITH CHECK (organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
));
```

## 🧪 SÄKERHETSTESTER

### Test Template 1: Organisation Isolation
```python
import pytest
from uuid import uuid4
from gastropartner.tests.conftest import TestClient

def test_user_cannot_access_other_organization_data(test_client: TestClient):
    """Test att användare inte kan komma åt andra organisationers data."""
    
    # Skapa två organisationer
    org1_id = uuid4()
    org2_id = uuid4()
    
    # Skapa data för organisation 1
    with test_client.organization_context(org1_id):
        response = test_client.post("/your-endpoint/", json={
            "name": "Org 1 Item"
        })
        assert response.status_code == 201
        item_id = response.json()["item_id"]
    
    # Försök komma åt organisation 1:s data från organisation 2
    with test_client.organization_context(org2_id):
        response = test_client.get(f"/your-endpoint/{item_id}")
        assert response.status_code == 404  # Ska inte hittas
    
    # Lista items för organisation 2 - ska vara tom
    with test_client.organization_context(org2_id):
        response = test_client.get("/your-endpoint/")
        assert response.status_code == 200
        assert len(response.json()) == 0  # Inga items från org 1
```

### Test Template 2: Autentisering Required
```python
def test_endpoint_requires_authentication(test_client: TestClient):
    """Test att endpoint kräver autentisering."""
    
    # Försök komma åt endpoint utan autentisering
    response = test_client.get("/your-endpoint/", headers={})
    assert response.status_code == 401
    
    # Försök skapa data utan autentisering
    response = test_client.post("/your-endpoint/", json={
        "name": "Test Item"
    }, headers={})
    assert response.status_code == 401
```

## 🚨 SÄKERHETSVALIDERING

### Kör Säkerhetsvalidering
```bash
# Kör fullständig säkerhetskontroll
cd gastropartner-backend
uv run python security_validation_tool.py --check-all

# Kör specifika kontroller
uv run python security_validation_tool.py --check-queries
uv run python security_validation_tool.py --check-auth
uv run python security_validation_tool.py --check-dev-bypasses
```

### CI/CD Integration
```yaml
# .github/workflows/security.yml
name: Security Validation
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd gastropartner-backend
          pip install uv
          uv sync
      - name: Run security validation
        run: |
          cd gastropartner-backend
          uv run python security_validation_tool.py --check-all
```

## 📋 SÄKERHETSCHECKLISTA

### Innan du skriver kod:
- [ ] Läs denna guide helt
- [ ] Förstå organisation isolation requirements
- [ ] Planera för organisation filtering i alla queries
- [ ] Inkludera autentisering i alla endpoints

### Under utveckling:
- [ ] Använd templates från denna guide
- [ ] Filtrera ALLA queries på organization_id
- [ ] Kräv autentisering för ALLA endpoints
- [ ] Sätt organization_id och creator_id på alla INSERTs
- [ ] Inga hårdkodade development bypasses

### Innan commit:
- [ ] Kör säkerhetsvalidering: `uv run python security_validation_tool.py --check-all`
- [ ] Kör tester: `uv run pytest`
- [ ] Code review med fokus på säkerhet
- [ ] Verifiera att inga development bypasses finns

### Innan deployment:
- [ ] Fullständig säkerhetsvalidering PASSED
- [ ] Alla kritiska säkerhetsproblem lösta
- [ ] Multi-tenant isolation testade
- [ ] Inga development user IDs i produktionskod

## 🆘 VID SÄKERHETSPROBLEM

1. **OMEDELBART:** Stoppa alla deployments
2. **BEDÖMNING:** Kör fullständig säkerhetsvalidering
3. **ISOLERING:** Identifiera påverkade organisationer
4. **ÅTGÄRD:** Fixa sårbarhet med prioritet
5. **VALIDERING:** Kör om fullständig säkerhetstestning
6. **NOTIFIERING:** Informera påverkade intressenter
7. **DOKUMENTATION:** Uppdatera säkerhetsprotokoll

---

**⚠️ VIKTIGT:** Multi-tenant säkerhet är KRITISKT för kundförtroende och regelefterlevnad. Följ denna guide exakt och kör säkerhetsvalidering innan VARJE deployment.