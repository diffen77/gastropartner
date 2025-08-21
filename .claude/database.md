# Database Management & Supabase Standards

## **CRITICAL DATABASE RULE - READ THIS FIRST**
**🚨 MANDATORY: ALWAYS use the Supabase MCP server for ALL database operations 🚨**

**NEVER SUGGEST MANUAL SQL EXECUTION. NEVER CREATE .sql FILES FOR MANUAL EXECUTION.**

## 🚨 MULTI-TENANT SECURITY REQUIREMENTS

**ABSOLUT REGEL: VARJE DATABAS-OPERATION MÅSTE FILTRERA PÅ ORGANISATION**

**MANDATORY ORGANIZATION ISOLATION:**
1. **ALL queries MUST include organization_id filter**: Varje SELECT, UPDATE, DELETE måste filtrera på organization_id
2. **VERIFY USER BELONGS TO ORGANIZATION**: Använd alltid get_user_organization() dependency
3. **NO CROSS-ORGANIZATION DATA ACCESS**: Användare får ALDRIG se data från andra organisationer
4. **DEVELOPMENT ORG ISOLATION**: Organisation 87654321-4321-4321-4321-210987654321 är ENDAST för utvecklare

**FÖRBJUDNA QUERIES - DESSA FÅR ALDRIG KÖRAS:**
```sql
-- ❌ FÖRBJUDET: Query utan organization_id filter
SELECT * FROM recipes;
SELECT * FROM ingredients;
SELECT * FROM menu_items;

-- ❌ FÖRBJUDET: Lägga till användare i utvecklingsorganisation
INSERT INTO organization_users (user_id, organization_id, role) 
VALUES ('REAL_USER_ID', '87654321-4321-4321-4321-210987654321', 'owner');
```

**RÄTT SÄTT - ANVÄND ALLTID ORGANISATION FILTER:**
```sql
-- ✅ RÄTT: Query med organization_id filter
SELECT * FROM recipes WHERE organization_id = ?;
SELECT * FROM ingredients WHERE organization_id = ?;

-- ✅ RÄTT: Skapa ny organisation för varje ny användare
INSERT INTO organizations (name, owner_id) VALUES ('User Organization', 'USER_ID');
```

**REQUIRED WORKFLOW:**
1. **ALWAYS CHECK .env FILE FIRST**: Read .env to get correct SUPABASE_URL and project ID
2. **ALL SQL changes**: Use `mcp__supabase__apply_migration` for schema changes
3. **ALL SQL queries**: Use `mcp__supabase__execute_sql` for data operations
4. **ALL updates**: Use `mcp__supabase__execute_sql` for UPDATE, INSERT, DELETE
5. **Project ID**: ALWAYS extract from SUPABASE_URL in .env file (currently: mrfxvnobevzcxsdlznyp)
6. **Validation**: Use `mcp__supabase__get_advisors` after schema changes
7. **Retry on timeout**: If connection timeout occurs, try again with simpler queries
8. **ALWAYS VERIFY ORGANIZATION ISOLATION**: Kontrollera att queries filtrerar på organization_id

**VIOLATION EXAMPLES:**
```bash
# ❌ NEVER do this - NO manual SQL files
cat fix_something.sql
psql -h localhost -d mydb -c "UPDATE..."
# ❌ NEVER suggest "run this SQL manually"
# ❌ NEVER say "database connection timeout, run manually"

# ✅ ALWAYS do this instead
# Step 1: Read .env file to get project ID from SUPABASE_URL
# Step 2: Use correct project ID from .env
mcp__supabase__execute_sql(project_id="mrfxvnobevzcxsdlznyp", query="UPDATE...")
# ✅ Retry on timeout with same MCP call
# ✅ Use apply_migration for schema changes
```

## Entity-Specific Primary Keys
All database tables use entity-specific primary keys for clarity and consistency:

```sql
-- ✅ STANDARDIZED: Entity-specific primary keys
sessions.session_id UUID PRIMARY KEY
leads.lead_id UUID PRIMARY KEY
messages.message_id UUID PRIMARY KEY
daily_metrics.daily_metric_id UUID PRIMARY KEY
agencies.agency_id UUID PRIMARY KEY
```

## Field Naming Conventions

```sql
-- Primary keys: {entity}_id
session_id, lead_id, message_id

-- Foreign keys: {referenced_entity}_id
session_id REFERENCES sessions(session_id)
agency_id REFERENCES agencies(agency_id)

-- Timestamps: {action}_at
created_at, updated_at, started_at, expires_at

-- Booleans: is_{state}
is_connected, is_active, is_qualified

-- Counts: {entity}_count
message_count, lead_count, notification_count

-- Durations: {property}_{unit}
duration_seconds, timeout_minutes
```

## Repository Pattern Auto-Derivation

The enhanced BaseRepository automatically derives table names and primary keys:

```python
# ✅ STANDARDIZED: Convention-based repositories
class LeadRepository(BaseRepository[Lead]):
    def __init__(self):
        super().__init__()  # Auto-derives "leads" and "lead_id"

class SessionRepository(BaseRepository[AvatarSession]):
    def __init__(self):
        super().__init__()  # Auto-derives "sessions" and "session_id"
```

**Benefits**:

- ✅ Self-documenting schema
- ✅ Clear foreign key relationships
- ✅ Eliminates repository method overrides
- ✅ Consistent with entity naming patterns

## Model-Database Alignment

Models mirror database fields exactly to eliminate field mapping complexity:

```python
# ✅ STANDARDIZED: Models mirror database exactly
class Lead(BaseModel):
    lead_id: UUID = Field(default_factory=uuid4)  # Matches database field
    session_id: UUID                               # Matches database field
    agency_id: str                                 # Matches database field
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = ConfigDict(
        use_enum_values=True,
        populate_by_name=True,
        alias_generator=None  # Use exact field names
    )
```

## API Route Standards

```python
# ✅ STANDARDIZED: RESTful with consistent parameter naming
router = APIRouter(prefix="/api/v1/leads", tags=["leads"])

@router.get("/{lead_id}")           # GET /api/v1/leads/{lead_id}
@router.put("/{lead_id}")           # PUT /api/v1/leads/{lead_id}
@router.delete("/{lead_id}")        # DELETE /api/v1/leads/{lead_id}

# Sub-resources
@router.get("/{lead_id}/messages")  # GET /api/v1/leads/{lead_id}/messages
@router.get("/agency/{agency_id}")  # GET /api/v1/leads/agency/{agency_id}
```

For complete naming standards, see [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md).