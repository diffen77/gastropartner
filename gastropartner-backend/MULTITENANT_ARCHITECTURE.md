# Multitenant Architecture Documentation

## Overview

GastroPartner implements a **shared database, shared schema** multitenant architecture with organization-level tenancy. This approach provides strong data isolation while maintaining operational efficiency.

## Architecture Components

### 1. Database Schema Design

#### Core Tables
- **organizations**: Tenant management
- **organization_users**: User-organization relationships with roles
- **modules**: System-wide feature modules
- **organization_modules**: Per-organization module activation

#### Tenant Data Tables
All business data tables include `organization_id` for tenant isolation:
- **ingredients**: Organization-specific ingredients
- **recipes**: Organization-specific recipes
- **recipe_ingredients**: Links recipes to ingredients
- **menu_items**: Organization-specific menu items

### 2. Row Level Security (RLS)

#### Security Strategy
- **Mandatory RLS**: All tables have RLS enabled
- **Helper Functions**: Centralized tenant access validation
- **Policy Patterns**: Consistent CRUD policies across all tables

#### Key Security Functions
```sql
-- Check if user belongs to organization
public.user_belongs_to_organization(org_id UUID) RETURNS BOOLEAN

-- Get organization from JWT (future extension)
public.get_current_organization_id() RETURNS UUID
```

#### Policy Examples
```sql
-- Organizations: Users can only see their organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.user_belongs_to_organization(organization_id));

-- Ingredients: Organization members can manage
CREATE POLICY "Ingredients: organization members can view"
ON public.ingredients FOR SELECT
TO authenticated
USING (public.user_belongs_to_organization(organization_id));
```

### 3. Application Layer

#### Repository Pattern
```python
class BaseRepository(Generic[ModelType, CreateType, UpdateType]):
    """Base repository with automatic tenant isolation."""
    
    async def create(self, data: CreateType, organization_id: UUID) -> ModelType:
        """Create with tenant context."""
        
    async def get_by_id(self, record_id: UUID, organization_id: UUID) -> ModelType:
        """Get with tenant validation."""
```

#### Tenant Context Management
```python
# Dependency injection for organization context
async def get_user_organization(current_user: User) -> UUID:
    """Get user's primary organization."""

# Future: Multi-organization support
async def get_organization_context(organization_id: UUID | None = None) -> UUID:
    """Get organization with access validation."""
```

#### Model Mixins
```python
class TenantMixin(BaseModel):
    """Mixin for tenant-aware models."""
    organization_id: UUID
    
    def belongs_to_organization(self, org_id: UUID) -> bool:
        return self.organization_id == org_id
```

## Security Implementation

### Data Isolation Guarantees

1. **Database Level**: RLS policies prevent cross-tenant data access
2. **Application Level**: Repository pattern enforces tenant context
3. **API Level**: Dependencies validate organization access
4. **Model Level**: TenantMixin provides tenant validation

### User-Organization Relationships

#### Role Hierarchy
- **owner**: Full control over organization
- **admin**: User management and configuration
- **member**: Standard access to organization data

#### Access Control Matrix
| Operation | Member | Admin | Owner |
|-----------|--------|-------|-------|
| View data | ✅ | ✅ | ✅ |
| Modify data | ✅ | ✅ | ✅ |
| Invite users | ❌ | ✅ | ✅ |
| Update roles | ❌ | ❌ | ✅ |
| Delete org | ❌ | ❌ | ✅ |

### Authentication Flow

1. **User Login**: Standard Supabase Auth
2. **Organization Resolution**: Lookup user's organization(s)
3. **Context Injection**: Add organization_id to request context
4. **RLS Enforcement**: Database policies enforce isolation
5. **API Validation**: Additional application-level checks

## API Endpoints

### Multitenant Management
```
GET /api/v1/organizations/                    # List user organizations
GET /api/v1/organizations/primary             # Get primary organization
POST /api/v1/organizations/{id}/users/{id}/invite  # Invite user
DELETE /api/v1/organizations/{id}/users/{id}  # Remove user
PUT /api/v1/organizations/{id}/users/{id}/role     # Update role
GET /api/v1/organizations/{id}/access-check   # Check access
```

### Data Access Patterns
All data endpoints automatically enforce tenant isolation:
```
GET /api/v1/ingredients/        # Only organization's ingredients
POST /api/v1/recipes/           # Create in user's organization
PUT /api/v1/menu_items/{id}     # Update if belongs to organization
```

## Development Guidelines

### Creating Tenant-Aware Features

1. **Database Schema**:
   ```sql
   CREATE TABLE new_feature (
       feature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       organization_id UUID NOT NULL REFERENCES organizations(organization_id),
       -- other fields
   );
   
   ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;
   ```

2. **RLS Policies**:
   ```sql
   CREATE POLICY "Feature: organization members can view"
   ON public.new_feature FOR SELECT
   TO authenticated
   USING (public.user_belongs_to_organization(organization_id));
   ```

3. **Python Model**:
   ```python
   class NewFeature(BaseModel, TenantMixin):
       feature_id: UUID = Field(default_factory=uuid4)
       name: str
       # organization_id inherited from TenantMixin
   ```

4. **Repository**:
   ```python
   class NewFeatureRepository(BaseRepository[NewFeature, ...]):
       def __init__(self, supabase: Client):
           super().__init__(
               supabase=supabase,
               table_name="new_feature",
               model_class=NewFeature,
               primary_key="feature_id",
           )
   ```

5. **API Endpoints**:
   ```python
   @router.get("/new-features/")
   async def list_features(
       organization_id: UUID = Depends(get_user_organization),
       repo: NewFeatureRepository = Depends(get_repository),
   ):
       return await repo.list(organization_id)
   ```

### Testing Tenant Isolation

```python
# Test data isolation
async def test_tenant_isolation():
    org1_data = await repo.list(org1_id)
    org2_data = await repo.list(org2_id)
    
    # Verify no cross-tenant data leakage
    assert not any(item.organization_id == org2_id for item in org1_data)
    assert not any(item.organization_id == org1_id for item in org2_data)
```

## Future Enhancements

### Multi-Organization Users
Currently MVP supports one organization per user. Future versions will support:
- Organization selection in JWT claims
- Organization switching in UI
- Cross-organization data sharing (with explicit permissions)

### Organization Hierarchies
Support for parent-child organization relationships:
- Department isolation within companies
- Franchise management
- Multi-brand operations

### Advanced Security Features
- Organization-specific encryption keys
- Audit logging per organization
- Custom compliance requirements
- Data residency controls

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**:
   ```
   Error: permission denied for table
   Solution: Check user belongs to organization
   ```

2. **Missing Organization Context**:
   ```
   Error: organization_id required
   Solution: Ensure get_user_organization dependency
   ```

3. **Cross-Tenant Data Access**:
   ```
   Error: Record not found
   Solution: Verify organization_id matches user's org
   ```

### Security Validation

```sql
-- Test RLS is working
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-id"}';

-- Should return empty (no access without org membership)
SELECT * FROM ingredients;
```

### Performance Monitoring

Monitor tenant isolation performance:
- Index on organization_id for all tenant tables
- Query plan analysis for RLS overhead
- Connection pooling per organization (if needed)

## Compliance and Auditing

### Data Protection
- **GDPR Compliance**: Organization-level data export/deletion
- **Data Residency**: Future support for region-specific deployments
- **Access Logging**: All cross-tenant access attempts logged

### Audit Requirements
- **Change Tracking**: All data modifications logged with organization context
- **Access Monitoring**: Failed tenant access attempts tracked
- **Policy Validation**: Regular RLS policy effectiveness reviews

## Conclusion

This multitenant architecture provides:
- **Strong Data Isolation**: Database and application-level enforcement
- **Scalable Design**: Shared infrastructure with tenant separation
- **Security First**: Multiple layers of access validation
- **Developer Friendly**: Consistent patterns for new features
- **Future Ready**: Extensible for advanced multi-tenancy features