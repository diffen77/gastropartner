"""Data models för GastroPartner."""

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Base user model."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    """User creation model."""

    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """User update model."""

    full_name: str | None = Field(None, min_length=1, max_length=255)


class User(UserBase):
    """Complete user model."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    email_confirmed_at: datetime | None = None
    last_sign_in_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


class OrganizationBase(BaseModel):
    """Base organization model för multitenant."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)


class OrganizationCreate(OrganizationBase):
    """Organization creation model."""
    pass


class OrganizationUpdate(BaseModel):
    """Organization update model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)


class Organization(OrganizationBase):
    """Complete organization model."""

    organization_id: UUID = Field(default_factory=uuid4, alias="id")
    created_at: datetime
    updated_at: datetime
    owner_id: UUID | None = None
    slug: str | None = None
    plan: str = "free"
    settings: dict[str, Any] = Field(default_factory=dict)

    # Freemium limits
    max_ingredients: int = 50
    max_recipes: int = 5
    max_menu_items: int = 2

    # Current usage (updated by triggers)
    current_ingredients: int = 0
    current_recipes: int = 0
    current_menu_items: int = 0

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        populate_by_name=True,
    )


class UserOrganizationRole(BaseModel):
    """User role in organization."""

    user_id: UUID
    organization_id: UUID
    role: str = Field(..., pattern="^(owner|admin|member)$")
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# API Response models
class AuthResponse(BaseModel):
    """Authentication response."""

    access_token: str
    refresh_token: str
    user: User
    expires_in: int


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response model."""

    message: str
    error_code: str | None = None
    details: dict[str, Any] | None = None
    success: bool = False


# ===== COST CONTROL MODELS =====

# Ingredient models
class IngredientBase(BaseModel):
    """Base ingredient model."""

    name: str = Field(..., min_length=1, max_length=255)
    category: str | None = Field(None, max_length=100)
    unit: str = Field(default="kg", max_length=20)
    cost_per_unit: float = Field(ge=0, decimal_places=2)
    supplier: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)


class IngredientCreate(IngredientBase):
    """Ingredient creation model."""
    pass


class IngredientUpdate(BaseModel):
    """Ingredient update model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, max_length=100)
    unit: str | None = Field(None, max_length=20)
    cost_per_unit: float | None = Field(None, ge=0, decimal_places=2)
    supplier: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)
    is_active: bool | None = None


class Ingredient(IngredientBase):
    """Complete ingredient model."""

    ingredient_id: UUID = Field(default_factory=uuid4)
    organization_id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# Recipe ingredient models
class RecipeIngredientBase(BaseModel):
    """Base recipe ingredient model."""

    ingredient_id: UUID
    quantity: float = Field(gt=0, decimal_places=3)
    unit: str = Field(..., max_length=20)
    notes: str | None = Field(None, max_length=500)


class RecipeIngredientCreate(RecipeIngredientBase):
    """Recipe ingredient creation model."""
    pass


class RecipeIngredientUpdate(BaseModel):
    """Recipe ingredient update model."""

    quantity: float | None = Field(None, gt=0, decimal_places=3)
    unit: str | None = Field(None, max_length=20)
    notes: str | None = Field(None, max_length=500)


class RecipeIngredient(RecipeIngredientBase):
    """Complete recipe ingredient model with ingredient details."""

    recipe_ingredient_id: UUID = Field(default_factory=uuid4)
    recipe_id: UUID
    ingredient: Ingredient | None = None  # Populated via join
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# Recipe models
class RecipeBase(BaseModel):
    """Base recipe model."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    servings: int = Field(default=1, ge=1)
    prep_time_minutes: int | None = Field(None, ge=0)
    cook_time_minutes: int | None = Field(None, ge=0)
    instructions: str | None = Field(None, max_length=5000)
    notes: str | None = Field(None, max_length=1000)


class RecipeCreate(RecipeBase):
    """Recipe creation model."""
    ingredients: list[RecipeIngredientCreate] = Field(default_factory=list)


class RecipeUpdate(BaseModel):
    """Recipe update model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    servings: int | None = Field(None, ge=1)
    prep_time_minutes: int | None = Field(None, ge=0)
    cook_time_minutes: int | None = Field(None, ge=0)
    instructions: str | None = Field(None, max_length=5000)
    notes: str | None = Field(None, max_length=1000)
    is_active: bool | None = None


class Recipe(RecipeBase):
    """Complete recipe model."""

    recipe_id: UUID = Field(default_factory=uuid4)
    organization_id: UUID
    ingredients: list[RecipeIngredient] = Field(default_factory=list)
    total_cost: float = Field(default=0.0, ge=0)  # Calculated field
    cost_per_serving: float = Field(default=0.0, ge=0)  # Calculated field
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# Menu item models
class MenuItemBase(BaseModel):
    """Base menu item model."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    category: str | None = Field(None, max_length=100)
    selling_price: float = Field(ge=0, decimal_places=2)
    target_food_cost_percentage: float = Field(default=30.0, ge=0, le=100, decimal_places=2)


class MenuItemCreate(MenuItemBase):
    """Menu item creation model."""
    recipe_id: UUID | None = None


class MenuItemUpdate(BaseModel):
    """Menu item update model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    category: str | None = Field(None, max_length=100)
    selling_price: float | None = Field(None, ge=0, decimal_places=2)
    target_food_cost_percentage: float | None = Field(None, ge=0, le=100, decimal_places=2)
    recipe_id: UUID | None = None
    is_active: bool | None = None


class MenuItem(MenuItemBase):
    """Complete menu item model."""

    menu_item_id: UUID = Field(default_factory=uuid4)
    organization_id: UUID
    recipe_id: UUID | None = None
    recipe: Recipe | None = None  # Populated via join
    food_cost: float = Field(default=0.0, ge=0)  # Calculated field
    food_cost_percentage: float = Field(default=0.0, ge=0)  # Calculated field
    margin: float = Field(default=0.0)  # Calculated field
    margin_percentage: float = Field(default=0.0)  # Calculated field
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# Cost analysis models
class CostAnalysis(BaseModel):
    """Cost analysis for recipes and menu items."""

    total_ingredient_cost: float = Field(ge=0)
    cost_per_serving: float = Field(ge=0)
    selling_price: float | None = Field(None, ge=0)
    food_cost_percentage: float | None = Field(None, ge=0, le=100)
    margin: float | None = None
    margin_percentage: float | None = None
    target_food_cost_percentage: float | None = Field(None, ge=0, le=100)
    recommended_selling_price: float | None = Field(None, ge=0)


class UsageLimitsCheck(BaseModel):
    """Model for checking freemium usage limits."""

    current_ingredients: int = Field(ge=0)
    max_ingredients: int = Field(ge=0)
    current_recipes: int = Field(ge=0)
    max_recipes: int = Field(ge=0)
    current_menu_items: int = Field(ge=0)
    max_menu_items: int = Field(ge=0)
    can_add_ingredient: bool
    can_add_recipe: bool
    can_add_menu_item: bool
    upgrade_needed: bool
