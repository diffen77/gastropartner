# Recipe Management Architecture Documentation

## Overview

This document describes the comprehensive architecture for the integrated Recipe Management module that consolidates ingredients, recipes, and menu items into a unified tabbed interface.

## Project Background

### Migration Context
The GastroPartner application previously had three separate pages:
- `/ingredienser` - Ingredients.tsx
- `/recept` - Recipes.tsx
- `/matratter` - MenuItems.tsx

These have been consolidated into a single integrated module at `/recepthantering` with tab-based navigation.

### Business Value
- **Improved User Experience**: Related functionality in one place
- **Better Data Relationships**: Clear visibility of ingredient → recipe → menu item dependencies
- **Reduced Navigation**: Single page for all recipe-related operations
- **Enhanced Workflow**: Seamless transitions between ingredients, recipes, and menu items

## Architecture Overview

### High-Level Structure
```
RecipeManagement (Main Container)
├── RecipeManagementProvider (Context)
├── PageHeader
├── OrganizationSelector (Multi-tenant support)
└── Tab Navigation
    ├── IngredientsTab
    ├── RecipesTab
    └── MenuItemsTab
```

### Key Components

#### 1. RecipeManagement.tsx (Main Container)
**Location**: `/src/pages/RecipeManagement.tsx`

**Responsibilities**:
- Tab navigation management
- URL parameter handling for direct linking
- Integration with RecipeManagementContext
- Responsive design coordination

**Key Features**:
- Tab configuration with icons and labels
- URL-based tab switching (`?tab=ingredients`)
- Browser history integration
- TypeScript type safety with `RecipeManagementTab` union type

#### 2. RecipeManagementContext.tsx (State Management)
**Location**: `/src/contexts/RecipeManagementContext.tsx`

**Responsibilities**:
- Centralized state management for all recipe data
- Cross-tab data synchronization
- Dependency-aware data refreshing
- Error and loading state management

**Key Features**:
- **Centralized Data Store**: All ingredients, recipes, and menu items
- **Dependency Management**: Automatic cascade updates
- **Performance Optimized**: Efficient loading states and caching
- **Error Resilience**: Comprehensive error handling per data type

#### 3. Tab Components
**Location**: `/src/components/RecipeManagement/`

**Components**:
- `IngredientsTab.tsx` - Full ingredients CRUD functionality
- `RecipesTab.tsx` - Complete recipes management
- `MenuItemsTab.tsx` - Menu items with profitability analysis

**Shared Features**:
- Conditional loading (only load data when tab is active)
- Consistent UI patterns (SearchableTable, MetricsCards)
- Integrated form handling
- Error state management

## State Management Architecture

### Data Flow Design

#### Dependency Chain
```
Ingredients ← Recipes ← Menu Items
     ↓         ↓         ↓
   Costs → Recipe Costs → Menu Profitability
```

#### Cascade Update Logic
When data changes, the system intelligently updates dependent data:

```typescript
// Ingredient changes affect everything downstream
onIngredientChange() → {
  refreshIngredients()
  refreshRecipes()      // Recipe costs may change
  refreshMenuItems()    // Menu profitability may change
}

// Recipe changes affect menu items
onRecipeChange() → {
  refreshRecipes()
  refreshMenuItems()    // Menu costs may change
}

// Menu item changes are isolated
onMenuItemChange() → {
  refreshMenuItems()
}
```

#### State Structure
```typescript
interface RecipeManagementState {
  ingredients: Ingredient[]
  recipes: Recipe[]
  menuItems: MenuItem[]
  isLoading: {
    ingredients: boolean
    recipes: boolean
    menuItems: boolean
  }
  errors: {
    ingredients: string
    recipes: string
    menuItems: string
  }
}
```

### Context API Implementation

#### Provider Pattern
The `RecipeManagementProvider` wraps the entire module and provides:
- **Data Access**: Centralized data for all tabs
- **Actions**: CRUD operations with dependency awareness
- **State Updates**: Efficient state management with React hooks

#### Hook Usage
```typescript
const {
  ingredients, recipes, menuItems,
  isLoading, errors,
  loadIngredients, onIngredientChange,
  // ... other actions
} = useRecipeManagement()
```

## Routing and Navigation

### URL Structure
- Main page: `/recepthantering`
- Direct tab access: `/recepthantering?tab=ingredients`
- Backward compatibility:
  - `/ingredienser` → `/recepthantering?tab=ingredients`
  - `/recept` → `/recepthantering?tab=recipes`
  - `/matratter` → `/recepthantering?tab=menu-items`

### Navigation Implementation

#### Browser History Integration
```typescript
const handleTabChange = (tabKey: RecipeManagementTab) => {
  setActiveTab(tabKey)
  const url = new URL(window.location.href)
  url.searchParams.set('tab', tabKey)
  window.history.pushState({}, '', url.toString())
}
```

#### Backward Compatibility Routes (App.tsx)
```typescript
// Legacy routes redirect to integrated module
<Route path="/ingredienser"
       element={<Navigate to="/recepthantering?tab=ingredients" replace />} />
<Route path="/recept"
       element={<Navigate to="/recepthantering?tab=recipes" replace />} />
<Route path="/matratter"
       element={<Navigate to="/recepthantering?tab=menu-items" replace />} />
```

#### Updated Sidebar Navigation (Sidebar.tsx)
```typescript
// Single menu item replaces three separate entries
{ id: 'recipe-management', label: 'Recepthantering', icon: '🍽️',
  path: '/recepthantering', moduleId: 'recipes' }
```

## Component Architecture

### Shared Component Patterns

All tab components follow consistent patterns:

#### 1. Data Loading Pattern
```typescript
useEffect(() => {
  if (isActive) {
    loadData()
  }
}, [isActive, loadData])
```

#### 2. CRUD Operations Pattern
```typescript
const handleCreate = async (data) => {
  try {
    await apiClient.create(data)
    await onDataChange() // Trigger dependency updates
  } catch (error) {
    setError(translateError(error))
  }
}
```

#### 3. Metrics Display Pattern
```typescript
<div className="metrics-grid">
  <MetricsCard title="Total Items" value={items.length} />
  <MetricsCard title="Average Cost" value={averageCost} />
  {/* Additional metrics */}
</div>
```

### Component Responsibilities

#### IngredientsTab
- **Primary Functions**: CRUD operations for ingredients
- **Metrics**: Count, categories, average costs, cost ranges
- **Business Logic**: Ingredient categorization and cost tracking
- **Dependencies**: None (base level of hierarchy)

#### RecipesTab
- **Primary Functions**: Recipe management with ingredient linking
- **Metrics**: Recipe count, cost analysis, serving calculations
- **Business Logic**: Recipe costing based on ingredient prices
- **Dependencies**: Ingredients (for cost calculations)

#### MenuItemsTab
- **Primary Functions**: Menu item management with recipe integration
- **Metrics**: Profitability analysis, margin calculations, VAT handling
- **Business Logic**: Complex profitability calculations with Swedish VAT
- **Dependencies**: Recipes and Ingredients (for complete cost analysis)

## User Experience Design

### Tab Navigation UX
- **Visual Indicators**: Clear active/inactive states
- **Icons and Labels**: Intuitive navigation with emoji icons
- **Keyboard Navigation**: Accessible tab switching
- **URL Persistence**: Shareable links to specific tabs

### Responsive Design
- **Desktop**: Horizontal tab layout with full labels
- **Mobile**: Optimized tab layout for touch interaction
- **Breakpoint**: 768px transition point
- **Touch Targets**: Appropriately sized for mobile interaction

### Performance Optimizations
- **Lazy Loading**: Tabs only load data when active
- **Efficient Re-renders**: useCallback and useMemo optimization
- **State Persistence**: Data cached in context between tab switches
- **Minimal API Calls**: Smart dependency-based refreshing

## Architecture Diagrams and Visual Documentation

### Component Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.tsx                                  │
│                    (Main Router)                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                 RecipeManagement                                │
│              (Main Container)                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            RecipeManagementProvider                     │    │
│  │              (Context Provider)                         │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │         RecipeManagementContent                 │    │    │
│  │  │          (Internal Component)                   │    │    │
│  │  │                                                 │    │    │
│  │  │  ┌─────────────────────────────────────────┐    │    │    │
│  │  │  │            PageHeader                   │    │    │    │
│  │  │  └─────────────────────────────────────────┘    │    │    │
│  │  │                                                 │    │    │
│  │  │  ┌─────────────────────────────────────────┐    │    │    │
│  │  │  │        OrganizationSelector             │    │    │    │
│  │  │  │      (Multi-tenant Context)             │    │    │    │
│  │  │  └─────────────────────────────────────────┘    │    │    │
│  │  │                                                 │    │    │
│  │  │  ┌─────────────────────────────────────────┐    │    │    │
│  │  │  │         Tab Navigation                  │    │    │    │
│  │  │  │    ┌─────┬─────────┬──────────┐        │    │    │    │
│  │  │  │    │🥬   │  📝     │   🍽️    │        │    │    │    │
│  │  │  │    │Ingr │ Recipes │ MenuItems│        │    │    │    │
│  │  │  │    └─────┴─────────┴──────────┘        │    │    │    │
│  │  │  └─────────────────────────────────────────┘    │    │    │
│  │  │                                                 │    │    │
│  │  │  ┌─────────────────────────────────────────┐    │    │    │
│  │  │  │          Tab Content                    │    │    │    │
│  │  │  │  ┌─────────────────────────────────┐    │    │    │    │
│  │  │  │  │  IngredientsTab  │  RecipesTab  │    │    │    │    │
│  │  │  │  │  ┌─────────────┐ │ MenuItemsTab │    │    │    │    │
│  │  │  │  │  │Active Tab   │ │ (Inactive)   │    │    │    │    │
│  │  │  │  │  │Component    │ │              │    │    │    │    │
│  │  │  │  │  └─────────────┘ │              │    │    │    │    │
│  │  │  │  └─────────────────────────────────┘    │    │    │    │
│  │  │  └─────────────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow and State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                RecipeManagementContext                         │
│                 (Central State Store)                          │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ ingredients │ │   recipes   │ │ menuItems   │               │
│  │   Array     │ │    Array    │ │    Array    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ isLoading   │ │   errors    │ │   actions   │               │
│  │   Object    │ │   Object    │ │  Functions  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Context Provider
                                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  IngredientsTab │ │   RecipesTab    │ │  MenuItemsTab   │
│                 │ │                 │ │                 │
│ useRecipeMgmt() │ │ useRecipeMgmt() │ │ useRecipeMgmt() │
│                 │ │                 │ │                 │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │   Actions   │ │ │ │   Actions   │ │ │ │   Actions   │ │
│ │             │ │ │ │             │ │ │ │             │ │
│ │loadIngreds()│ │ │ │loadRecipes()│ │ │ │loadMenus()  │ │
│ │onIngrChange │ │ │ │onRecChange  │ │ │ │onMenuChange │ │
│ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Dependency-Aware Cascade Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cascade Update Logic                         │
│               (Dependency-Aware Synchronization)                │
└─────────────────────────────────────────────────────────────────┘

🥬 INGREDIENT CHANGE (Most Impactful)
│
├─ onIngredientChange() triggered
│
├─ Parallel execution of:
│   ├─ refreshIngredientsData() ────────────────────┐
│   ├─ refreshRecipesData() ─────────────────────┐  │
│   └─ refreshMenuItemsData() ───────────────┐   │  │
│                                           │   │  │
│   ┌─ Recipe costs recalculated ←──────────┘   │  │
│   ├─ Menu profitability updated ←─────────────┘  │
│   └─ Ingredient data refreshed ←─────────────────┘

📝 RECIPE CHANGE (Medium Impact)
│
├─ onRecipeChange() triggered
│
├─ Parallel execution of:
│   ├─ refreshRecipesData() ─────────────────────┐
│   └─ refreshMenuItemsData() ───────────────┐   │
│                                           │   │
│   ├─ Menu costs recalculated ←────────────┘   │
│   └─ Recipe data refreshed ←───────────────────┘

🍽️ MENU ITEM CHANGE (Isolated)
│
├─ onMenuItemChange() triggered
│
└─ refreshMenuItemsData() ─────────────────────┐
                                               │
    Menu item data refreshed ←─────────────────┘
```

### User Interaction Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Journey Flow                          │
└─────────────────────────────────────────────────────────────────┘

START: User navigates to /recepthantering
│
▼
┌─────────────────────────────────────────┐
│         RecipeManagement loads          │
│    ┌─────────────────────────────────┐  │
│    │  URL parameter check:          │  │
│    │  ?tab=ingredients → Ingr. tab  │  │
│    │  ?tab=recipes → Recipes tab    │  │
│    │  ?tab=menu-items → Menu tab    │  │
│    │  (default) → Ingredients tab   │  │
│    └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────┐
│        Active Tab Rendering             │
│  ┌─────────────────────────────────┐    │
│  │  isActive={true} passed to tab │    │
│  │  useEffect loads tab data      │    │
│  │  Loading state management      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
│
▼                                    ┌─────────────────┐
┌─────────────────────────────────────┐              │
│          User Interactions          │              │
│                                     │              │
│  ┌─── Tab Click ──────────────────┐ │              │
│  │                                │ │              │
│  │  ├─ setActiveTab(tabKey)       │ │              │
│  │  ├─ URL update (pushState)     │ │◄─── CRUD ────┤
│  │  └─ Re-render with new tab     │ │   Operations  │
│  └────────────────────────────────┘ │              │
│                                     │              │
│  ┌─── CRUD Operations ─────────────┐ │              │
│  │                                │ │              │
│  │  ├─ Create/Update/Delete item  │ │              │
│  │  ├─ API call execution         │ │              │
│  │  ├─ Trigger onDataChange()     │ │              │
│  │  └─ Cascade refresh logic      │ │              │
│  └────────────────────────────────┘ │              │
└─────────────────────────────────────┘              │
│                                                    │
▼                                                    │
┌─────────────────────────────────────────┐          │
│         Cross-Tab Updates               │          │
│                                         │          │
│  ┌─ Ingredient changed ──────────────┐  │          │
│  │  └─ Refresh: Ingr + Recipe + Menu │  │          │
│  ├─ Recipe changed ─────────────────┐│  │          │
│  │  └─ Refresh: Recipe + Menu       ││  │          │
│  └─ Menu changed ──────────────────┐││  │          │
│     └─ Refresh: Menu only         │││  │          │
│                                   │││  │          │
│  All tabs show updated data ←─────┘┘┘  │          │
└─────────────────────────────────────────┘          │
                                                     │
END: User continues with updated data ←──────────────┘
```

### Legacy Migration Path

```
┌─────────────────────────────────────────────────────────────────┐
│                    Before Migration                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /ingredienser     /recept        /matratter                    │
│  ┌───────────┐    ┌─────────┐    ┌──────────┐                   │
│  │Ingredients│    │ Recipes │    │MenuItems │                   │
│  │   .tsx    │    │  .tsx   │    │  .tsx    │                   │
│  │           │    │         │    │          │                   │
│  │ - State   │    │ - State │    │ - State  │                   │
│  │ - Logic   │    │ - Logic │    │ - Logic  │                   │
│  │ - UI      │    │ - UI    │    │ - UI     │                   │
│  └───────────┘    └─────────┘    └──────────┘                   │
│       ▲                ▲              ▲                         │
│       │                │              │                         │
│   Isolated         Isolated       Isolated                     │
│   State            State          State                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                       MIGRATION PROCESS
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     After Migration                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    /recepthantering                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                RecipeManagement                         │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │           RecipeManagementContext               │    │    │
│  │  │            (Centralized State)                  │    │    │
│  │  │                                                 │    │    │
│  │  │  ingredients[] ←→ recipes[] ←→ menuItems[]      │    │    │
│  │  │         ▲             ▲            ▲           │    │    │
│  │  │         │             │            │           │    │    │
│  │  │    Dependencies   Dependencies Dependencies    │    │    │
│  │  │       Aware         Aware        Aware        │    │    │
│  │  │      Updates       Updates      Updates       │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐                  │    │
│  │  │Ingred.  │ │Recipes  │ │MenuItems │                  │    │
│  │  │Tab      │ │Tab      │ │Tab       │                  │    │
│  │  │         │ │         │ │          │                  │    │
│  │  │ - UI    │ │ - UI    │ │ - UI     │                  │    │
│  │  │ - Forms │ │ - Forms │ │ - Forms  │                  │    │
│  │  └─────────┘ └─────────┘ └──────────┘                  │    │
│  │        ▲           ▲           ▲                        │    │
│  │        └───────────┼───────────┘                        │    │
│  │                    │                                    │    │
│  │            Shared Context                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Backward Compatibility                     │    │
│  │                                                         │    │
│  │  /ingredienser  → /recepthantering?tab=ingredients      │    │
│  │  /recept       → /recepthantering?tab=recipes          │    │
│  │  /matratter    → /recepthantering?tab=menu-items       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Relationships and Dependencies

### Entity Relationships
```
Organization (Multi-tenant)
├── Ingredients
│   ├── id, name, category, cost, unit, supplier
│   └── Used in: Recipes
├── Recipes
│   ├── id, name, servings, ingredients[]
│   ├── Calculated: cost_per_serving
│   └── Used in: Menu Items
└── Menu Items
    ├── id, name, category, price, recipe_id
    └── Calculated: margin, profitability, VAT
```

### Cost Calculation Flow
1. **Ingredients**: Base cost per unit
2. **Recipes**: Sum of (ingredient_cost × quantity) / servings
3. **Menu Items**: (selling_price - recipe_cost) = margin

### Multi-tenant Security
All data operations automatically filter by `organization_id`:
- **API Level**: Supabase RLS policies enforce organization isolation
- **Frontend Level**: OrganizationSelector integration
- **Context Level**: All API calls include proper organization context

## Technical Implementation Details

### TypeScript Integration

#### Core Types
```typescript
export type RecipeManagementTab = 'ingredients' | 'recipes' | 'menu-items'

interface TabConfig {
  key: RecipeManagementTab
  label: string
  icon: string
  component: React.ComponentType<TabContentProps>
}

interface TabContentProps {
  isActive: boolean
}
```

#### Context Types
```typescript
interface RecipeManagementState { /* State interface */ }
interface RecipeManagementActions { /* Action interface */ }
type RecipeManagementContextType = RecipeManagementState & RecipeManagementActions
```

### Error Handling

#### Multi-Level Error Management
1. **API Level**: HTTP error responses
2. **Context Level**: Error state per data type
3. **Component Level**: User-friendly error messages
4. **Translation Level**: Localized error text

#### Error Recovery
- **Retry Logic**: Automatic retry for transient failures
- **Graceful Degradation**: Partial functionality during errors
- **User Feedback**: Clear error messages with recovery options

### Performance Considerations

#### Memory Management
- **Efficient State Updates**: Immutable update patterns
- **Component Cleanup**: Proper useEffect cleanup
- **Event Listener Management**: Addition and removal of listeners

#### Bundle Optimization
- **Code Splitting Potential**: Tab components can be lazy loaded
- **Import Optimization**: Efficient import structure
- **Asset Management**: Optimal CSS and component loading

## Styling and CSS Architecture

### CSS Class Structure
```scss
// Main container
.recipe-management-tabs
.tab-navigation
.tab-button (.active)
.tab-icon
.tab-label
.tab-content

// Tab-specific
.ingredients-tab
.recipes-tab
.menu-items-tab
.tab-actions

// Responsive
@media (max-width: 768px) {
  .tab-navigation { /* Mobile layout */ }
}
```

### Design System Integration
- **Color Scheme**: Consistent with app design tokens
- **Typography**: Standard font hierarchy
- **Spacing**: Grid-based layout system
- **Components**: Reuses existing MetricsCard, SearchableTable, etc.

## Integration with Existing Systems

### API Integration
- **Consistent Patterns**: Reuses existing `apiClient` methods
- **Error Translation**: Integrated `translateError` functionality
- **Multi-tenant Headers**: Automatic organization context

### Freemium System Integration
- **Usage Limits**: Integrated with `useFreemiumService`
- **Upgrade Prompts**: Contextual upgrade messaging
- **Tier Management**: Proper limit enforcement per entity type

### Module System Integration
- **Module Protection**: Recipe management module protection
- **Feature Flags**: Integration with existing feature flag system
- **Analytics**: User interaction tracking potential

## Testing Strategy

### Component Testing
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Tab switching and data flow
- **Context Testing**: State management and actions

### User Flow Testing
- **Navigation Testing**: Tab switching, URL handling
- **CRUD Operations**: Create, read, update, delete flows
- **Error Scenarios**: Error handling and recovery

### Performance Testing
- **Load Testing**: Large datasets in tabs
- **Memory Testing**: Long-running tab switching
- **Network Testing**: API failure scenarios

## Deployment and DevOps

### Build Process
- **Webpack Integration**: Standard React build process
- **TypeScript Compilation**: Full type checking
- **CSS Processing**: Standard SCSS compilation

### Environment Configuration
- **Development**: Hot reload with tab persistence
- **Production**: Optimized bundle with error boundaries
- **Testing**: Isolated environment configuration

## Migration Documentation for Future Developers

### Overview of Migration (Tasks 1-11)

The Recipe Management Consolidation project successfully merged three independent pages (`/ingredienser`, `/recept`, `/matratter`) into a unified tabbed interface (`/recepthantering`). This migration involved significant architectural changes that future developers need to understand for maintenance and enhancement.

### File Changes and Transformations

#### 🔄 Deprecated Files (Legacy System)
**These files were replaced and should NOT be modified:**

```
❌ DEPRECATED (DO NOT MODIFY):
├── gastropartner-frontend/src/pages/Ingredients.tsx
├── gastropartner-frontend/src/pages/Recipes.tsx
├── gastropartner-frontend/src/pages/MenuItems.tsx
└── Related individual context/state files
```

**Migration Path**: Content was extracted, refactored, and integrated into the new tab components.

#### ✅ New Architecture Files (Active System)
**These files constitute the new integrated system:**

```
✅ NEW INTEGRATED SYSTEM:
├── gastropartner-frontend/src/pages/RecipeManagement.tsx
├── gastropartner-frontend/src/contexts/RecipeManagementContext.tsx
├── gastropartner-frontend/src/components/RecipeManagement/
│   ├── IngredientsTab.tsx
│   ├── RecipesTab.tsx
│   └── MenuItemsTab.tsx
└── RECIPE_MANAGEMENT_ARCHITECTURE.md (this file)
```

#### 🔧 Modified System Files
**These existing files were updated to support the new architecture:**

```
🔧 UPDATED FOR INTEGRATION:
├── gastropartner-frontend/src/App.tsx
│   └── Added routing redirects for backward compatibility
├── gastropartner-frontend/src/components/Sidebar.tsx
│   └── Consolidated three menu items into single "Recepthantering" entry
└── package.json dependencies (if any were added during development)
```

### Key Migration Decisions and Rationale

#### 1. **Centralized State Management Decision**
**Before**: Each page managed its own state independently
```tsx
// Old pattern - isolated state per page
const [ingredients, setIngredients] = useState([]);
const [recipes, setRecipes] = useState([]);
const [menuItems, setMenuItems] = useState([]);
```

**After**: Unified state management via React Context
```tsx
// New pattern - centralized state with dependency awareness
const RecipeManagementContext = createContext({
  ingredients: [],
  recipes: [],
  menuItems: [],
  // Dependency-aware actions
  onIngredientChange: () => Promise<void>,
  onRecipeChange: () => Promise<void>,
  onMenuItemChange: () => Promise<void>
});
```

**Rationale**: Ingredients affect recipe costs, which affect menu item profitability. The dependency chain required shared state to maintain data consistency across tabs.

#### 2. **URL Structure Migration**
**Before**: Separate routes for each functionality
```
/ingredienser - Ingredients management
/recept       - Recipe management
/matratter    - Menu items management
```

**After**: Single route with tab parameters + backward compatibility
```
/recepthantering                    - Default (ingredients tab)
/recepthantering?tab=ingredients    - Explicit ingredients tab
/recepthantering?tab=recipes        - Recipes tab
/recepthantering?tab=menu-items     - Menu items tab

BACKWARD COMPATIBILITY REDIRECTS:
/ingredienser → /recepthantering?tab=ingredients
/recept      → /recepthantering?tab=recipes
/matratter   → /recepthantering?tab=menu-items
```

**Rationale**: Maintain existing user bookmarks and external links while providing unified navigation.

#### 3. **Component Structure Transformation**
**Before**: Monolithic page components with embedded functionality
```tsx
function Ingredients() {
  // State management
  // API calls
  // Form handling
  // UI rendering
  // All in one component
}
```

**After**: Separation of concerns with dedicated tab components
```tsx
function RecipeManagement() {
  // Tab navigation only
  return (
    <RecipeManagementProvider>
      <TabNavigation />
      <ActiveTabContent />
    </RecipeManagementProvider>
  );
}

function IngredientsTab({ isActive }) {
  // Only ingredients-specific UI
  // Uses shared context for state/actions
}
```

**Rationale**: Better maintainability, reusability, and clearer separation of responsibilities.

### Breaking Changes and Migration Considerations

#### 🚨 Breaking Changes for Developers

1. **Import Path Changes**
   ```tsx
   // OLD - These imports will fail
   import { Ingredients } from '../pages/Ingredients';
   import { Recipes } from '../pages/Recipes';
   import { MenuItems } from '../pages/MenuItems';

   // NEW - Use integrated module
   import { RecipeManagement } from '../pages/RecipeManagement';
   import { useRecipeManagement } from '../contexts/RecipeManagementContext';
   ```

2. **State Access Pattern Changes**
   ```tsx
   // OLD - Component-specific state
   const [ingredients, setIngredients] = useState([]);

   // NEW - Shared context state
   const { ingredients, loadIngredients, onIngredientChange } = useRecipeManagement();
   ```

3. **URL Generation Changes**
   ```tsx
   // OLD - Direct page links
   <Link to="/ingredienser">Ingredients</Link>

   // NEW - Tab-based links
   <Link to="/recepthantering?tab=ingredients">Ingredients</Link>
   ```

#### ✅ Non-Breaking Preserved Functionality

1. **Backward Compatibility**: All existing URLs redirect properly
2. **API Contracts**: No backend API changes required
3. **Data Models**: All data structures remain unchanged
4. **User Permissions**: Same access control patterns
5. **Multi-tenant Isolation**: Organization filtering preserved

### Development Guidelines for Future Work

#### 🎯 Working with the Integrated System

1. **Adding New Features to Tabs**
   ```tsx
   // DO: Add features through tab components
   function IngredientsTab({ isActive }) {
     const { ingredients, addIngredient } = useRecipeManagement();

     const handleNewFeature = () => {
       // New functionality here
       // Will automatically trigger dependency updates
       await addIngredient(newData);
     };
   }
   ```

2. **State Management Best Practices**
   ```tsx
   // DO: Use dependency-aware actions
   const handleIngredientUpdate = async () => {
     await updateIngredient(data);
     // This triggers cascade updates automatically
     await onIngredientChange();
   };

   // DON'T: Directly manipulate shared state
   // setIngredients([...newIngredients]); // ❌ Breaks dependency chain
   ```

3. **Tab-Specific Modifications**
   ```tsx
   // DO: Check isActive prop for performance
   useEffect(() => {
     if (isActive) {
       loadTabData();
     }
   }, [isActive, loadTabData]);

   // DON'T: Load data unconditionally
   // useEffect(() => loadTabData(), []); // ❌ Loads for inactive tabs
   ```

#### 🔧 Maintenance and Enhancement Patterns

1. **Adding New Tabs**
   - Update `RecipeManagementTab` union type
   - Add tab configuration in `tabs` array
   - Create new tab component following existing patterns
   - Update dependency-aware actions if needed

2. **Modifying State Structure**
   - Update `RecipeManagementState` interface
   - Implement migration logic for existing data
   - Update all dependent tab components
   - Test cascade update functionality

3. **Performance Optimization**
   - Verify lazy loading implementation
   - Check useCallback/useMemo usage
   - Monitor context re-render patterns
   - Optimize API call frequency

### Testing Considerations

#### 🧪 Test Coverage Requirements

1. **Tab Navigation Testing**
   ```tsx
   // Test URL parameter handling
   it('should activate correct tab from URL parameter', () => {
     render(<RecipeManagement />, {
       router: { initialEntries: ['/recepthantering?tab=recipes'] }
     });
     expect(screen.getByTestId('recipes-tab')).toHaveClass('active');
   });
   ```

2. **Dependency Chain Testing**
   ```tsx
   // Test cascade updates
   it('should update dependent data when ingredient changes', async () => {
     const { onIngredientChange } = useRecipeManagement();
     await onIngredientChange();

     expect(mockRefreshIngredients).toHaveBeenCalled();
     expect(mockRefreshRecipes).toHaveBeenCalled();
     expect(mockRefreshMenuItems).toHaveBeenCalled();
   });
   ```

3. **Backward Compatibility Testing**
   ```tsx
   // Test redirect functionality
   it('should redirect legacy URLs properly', () => {
     render(<App />, {
       router: { initialEntries: ['/ingredienser'] }
     });
     expect(window.location.pathname).toBe('/recepthantering');
     expect(window.location.search).toBe('?tab=ingredients');
   });
   ```

### Rollback Plan (Emergency Use Only)

#### 🚨 If Immediate Rollback Required

**Step 1: Restore Legacy Routes (5 minutes)**
```tsx
// In App.tsx - Temporarily restore direct imports
import { Ingredients } from './pages/Ingredients';
import { Recipes } from './pages/Recipes';
import { MenuItems } from './pages/MenuItems';

// Add routes back
<Route path="/ingredienser" element={<Ingredients />} />
<Route path="/recept" element={<Recipes />} />
<Route path="/matratter" element={<MenuItems />} />
```

**Step 2: Restore Sidebar Navigation (2 minutes)**
```tsx
// In Sidebar.tsx - Restore original navigation items
{ id: 'ingredients', label: 'Ingredienser', icon: '🥬', path: '/ingredienser' },
{ id: 'recipes', label: 'Recept', icon: '📝', path: '/recept' },
{ id: 'menu-items', label: 'Maträtter', icon: '🍽️', path: '/matratter' }
```

**Step 3: Disable New Route (1 minute)**
```tsx
// In App.tsx - Comment out or remove
// <Route path="/recepthantering" element={<RecipeManagement />} />
```

**Note**: This rollback approach requires that the original page files still exist in the repository. If they were deleted, they would need to be restored from version control first.

### Future Enhancement Hooks

#### 🚀 Extension Points for Future Development

1. **New Data Types**: The context pattern can be extended for additional related entities
2. **Advanced Filtering**: Cross-tab search and filtering capabilities
3. **Real-time Updates**: WebSocket integration for live data synchronization
4. **Offline Support**: Service worker integration for offline functionality
5. **Mobile Optimization**: Tab navigation enhancements for mobile devices

#### 🔮 Architectural Evolution Path

The current implementation provides a solid foundation for future enhancements:
- **Phase 1**: Additional tabs and data types
- **Phase 2**: Advanced user interactions (drag/drop, bulk operations)
- **Phase 3**: AI-powered recommendations and optimization
- **Phase 4**: Mobile application with shared codebase

### Documentation Maintenance

#### 📋 Required Updates When Modifying System

When making changes to the Recipe Management system, update these documentation sections:

1. **Component Hierarchy** - If adding/removing tabs or components
2. **Data Flow Diagrams** - If modifying state structure or dependency chains
3. **URL Structure** - If adding new tab types or navigation patterns
4. **Migration Documentation** - If making breaking changes that affect future development

**Responsible Parties**:
- **Feature Changes**: Developer making the change
- **Architecture Changes**: Tech lead review and approval required
- **Breaking Changes**: Full team review and stakeholder communication

---

**Last Updated**: September 14, 2025 (Recipe Management Consolidation - Task 12 Documentation)
**Change Summary**: Complete architecture documentation with visual diagrams, user flows, and comprehensive migration guidance
**Next Review**: October 14, 2025 (or upon next major architectural change)

## Troubleshooting Guide

### Common Issues

#### 1. Tab Not Loading Data
**Symptoms**: Empty tab content, no API calls
**Solution**: Check `isActive` prop and `useEffect` dependencies

#### 2. State Not Syncing Between Tabs
**Symptoms**: Changes in one tab not reflected in others
**Solution**: Verify `onDataChange` callbacks and context integration

#### 3. URL Navigation Issues
**Symptoms**: Direct links not working, tab switching problems
**Solution**: Check URL parameter handling and routing configuration

#### 4. Performance Issues
**Symptoms**: Slow tab switching, excessive API calls
**Solution**: Verify lazy loading implementation and useCallback usage

### Debugging Tools
- **React DevTools**: Component hierarchy and state inspection
- **Context Inspection**: RecipeManagementContext state
- **Network Tab**: API call monitoring
- **Console Logging**: Built-in dependency update logging

## Future Enhancement Opportunities

### Phase 1 Enhancements (Short-term)
- **Keyboard Shortcuts**: Tab navigation via keyboard
- **Drag & Drop**: Ingredients to recipes, recipes to menu items
- **Bulk Operations**: Multi-select and bulk actions
- **Advanced Search**: Cross-tab search functionality

### Phase 2 Enhancements (Medium-term)
- **Data Export**: CSV/PDF export per tab or combined
- **Import Functionality**: Bulk data import with validation
- **Recipe Calculator**: Interactive cost calculator tool
- **Inventory Integration**: Stock level tracking

### Phase 3 Enhancements (Long-term)
- **AI Recommendations**: Recipe cost optimization suggestions
- **Analytics Dashboard**: Usage patterns and profitability insights
- **Mobile App**: Native mobile application
- **API Integration**: Third-party recipe databases

## Maintenance and Support

### Code Maintenance
- **Regular Reviews**: Monthly code review cycle
- **Dependency Updates**: Quarterly dependency audits
- **Performance Monitoring**: Continuous performance tracking
- **User Feedback Integration**: Bi-weekly feedback review

### Documentation Updates
- **Architecture Changes**: Update this document for major changes
- **API Changes**: Maintain API documentation consistency
- **User Guides**: Keep end-user documentation current
- **Developer Onboarding**: Maintain developer setup guides

### Monitoring and Alerts
- **Error Tracking**: Production error monitoring
- **Performance Metrics**: Load time and interaction tracking
- **User Analytics**: Feature usage and adoption metrics
- **System Health**: API availability and response time monitoring

---

## Conclusion

The integrated Recipe Management module represents a significant architectural improvement that:
- **Consolidates Related Functionality**: Three separate pages into one cohesive module
- **Improves Data Relationships**: Clear dependency management and cascade updates
- **Enhances User Experience**: Intuitive tab navigation and workflow optimization
- **Maintains System Quality**: TypeScript safety, error handling, and performance optimization

This architecture provides a scalable foundation for future recipe management enhancements while maintaining compatibility with existing GastroPartner systems.

---

*Last Updated: September 14, 2025*
*Version: 1.0*
*Author: AI IDE Agent*