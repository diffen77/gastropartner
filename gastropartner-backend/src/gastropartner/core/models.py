"""Data models för GastroPartner."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator


class TenantMixin(BaseModel):
    """Mixin för models that belong to an organization (tenant)."""

    organization_id: UUID

    @computed_field
    @property
    def tenant_key(self) -> str:
        """Return a string key identifying the tenant."""
        return str(self.organization_id)

    def belongs_to_organization(self, organization_id: UUID) -> bool:
        """Check if this model belongs to the specified organization."""
        return self.organization_id == organization_id


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
    cost_per_unit: Decimal = Field(ge=0, decimal_places=2)
    supplier: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)

    @field_validator("cost_per_unit", mode="before")
    @classmethod
    def convert_cost_to_decimal(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


class IngredientCreate(IngredientBase):
    """Ingredient creation model."""
    pass


class IngredientUpdate(BaseModel):
    """Ingredient update model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, max_length=100)
    unit: str | None = Field(None, max_length=20)
    cost_per_unit: Decimal | None = Field(None, ge=0, decimal_places=2)
    supplier: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)
    is_active: bool | None = None

    @field_validator("cost_per_unit", mode="before")
    @classmethod
    def convert_cost_to_decimal(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


class Ingredient(IngredientBase, TenantMixin):
    """Complete ingredient model."""

    ingredient_id: UUID = Field(default_factory=uuid4)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        json_encoders={
            Decimal: float,  # Convert Decimal to float for JSON
        }
    )


# Recipe ingredient models
class RecipeIngredientBase(BaseModel):
    """Base recipe ingredient model."""

    ingredient_id: UUID
    quantity: Decimal = Field(gt=0, decimal_places=3)
    unit: str = Field(..., max_length=20)
    notes: str | None = Field(None, max_length=500)

    @field_validator("quantity", mode="before")
    @classmethod
    def convert_quantity_to_decimal(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


class RecipeIngredientCreate(RecipeIngredientBase):
    """Recipe ingredient creation model."""
    pass


class RecipeIngredientUpdate(BaseModel):
    """Recipe ingredient update model."""

    quantity: Decimal | None = Field(None, gt=0, decimal_places=3)
    unit: str | None = Field(None, max_length=20)
    notes: str | None = Field(None, max_length=500)

    @field_validator("quantity", mode="before")
    @classmethod
    def convert_quantity_to_decimal(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


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
    ingredients: list[RecipeIngredientCreate] | None = None
    is_active: bool | None = None


class Recipe(RecipeBase, TenantMixin):
    """Complete recipe model."""

    recipe_id: UUID = Field(default_factory=uuid4)
    ingredients: list[RecipeIngredient] = Field(default_factory=list)
    total_cost: Decimal = Field(default=Decimal("0.0"), ge=0)  # Calculated field
    cost_per_serving: Decimal = Field(default=Decimal("0.0"), ge=0)  # Calculated field
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
    selling_price: Decimal = Field(ge=0, decimal_places=2)
    target_food_cost_percentage: Decimal = Field(default=Decimal("30.0"), ge=0, le=100, decimal_places=2)

    @field_validator("selling_price", "target_food_cost_percentage", mode="before")
    @classmethod
    def convert_decimal_fields(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


class MenuItemCreate(MenuItemBase):
    """Menu item creation model."""
    recipe_id: UUID | None = None


class MenuItemUpdate(BaseModel):
    """Menu item update model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    category: str | None = Field(None, max_length=100)
    selling_price: Decimal | None = Field(None, ge=0, decimal_places=2)
    target_food_cost_percentage: Decimal | None = Field(None, ge=0, le=100, decimal_places=2)
    recipe_id: UUID | None = None
    is_active: bool | None = None

    @field_validator("selling_price", "target_food_cost_percentage", mode="before")
    @classmethod
    def convert_decimal_fields(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


class MenuItem(MenuItemBase, TenantMixin):
    """Complete menu item model."""

    menu_item_id: UUID = Field(default_factory=uuid4)
    recipe_id: UUID | None = None
    recipe: Recipe | None = None  # Populated via join
    food_cost: Decimal = Field(default=Decimal("0.0"), ge=0)  # Calculated field
    food_cost_percentage: Decimal = Field(default=Decimal("0.0"), ge=0)  # Calculated field
    margin: Decimal = Field(default=Decimal("0.0"))  # Calculated field
    margin_percentage: Decimal = Field(default=Decimal("0.0"))  # Calculated field
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

    total_ingredient_cost: Decimal = Field(ge=0)
    cost_per_serving: Decimal = Field(ge=0)
    selling_price: Decimal | None = Field(None, ge=0)
    food_cost_percentage: Decimal | None = Field(None, ge=0, le=100)
    margin: Decimal | None = None
    margin_percentage: Decimal | None = None
    target_food_cost_percentage: Decimal | None = Field(None, ge=0, le=100)
    recommended_selling_price: Decimal | None = Field(None, ge=0)

    @field_validator(
        "total_ingredient_cost",
        "cost_per_serving",
        "selling_price",
        "food_cost_percentage",
        "margin",
        "margin_percentage",
        "target_food_cost_percentage",
        "recommended_selling_price",
        mode="before"
    )
    @classmethod
    def convert_decimal_fields(cls, v):
        """Convert float/int/string to Decimal for proper handling."""
        if v is None:
            return v
        if isinstance(v, int | float | str):
            return Decimal(str(v))
        return v


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


# ===== FEATURE FLAGS MODELS =====

class FeatureFlagsBase(BaseModel):
    """Base feature flags model."""

    show_recipe_prep_time: bool = False
    show_recipe_cook_time: bool = False
    show_recipe_instructions: bool = False
    show_recipe_notes: bool = False


class FeatureFlagsUpdate(BaseModel):
    """Feature flags update model."""

    show_recipe_prep_time: bool | None = None
    show_recipe_cook_time: bool | None = None
    show_recipe_instructions: bool | None = None
    show_recipe_notes: bool | None = None


class FeatureFlags(FeatureFlagsBase, TenantMixin):
    """Complete feature flags model."""

    flags_id: UUID = Field(default_factory=uuid4)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ===== USER TESTING MODELS =====

# User feedback models
class UserFeedbackBase(BaseModel):
    """Base user feedback model."""

    feedback_type: str = Field(..., pattern="^(bug|feature_request|general|usability|satisfaction)$")
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    rating: int | None = Field(None, ge=1, le=5)
    page_url: str | None = Field(None, max_length=500)
    user_agent: str | None = Field(None, max_length=500)
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")


class UserFeedbackCreate(UserFeedbackBase):
    """User feedback creation model."""
    pass


class UserFeedbackUpdate(BaseModel):
    """User feedback update model."""

    status: str | None = Field(None, pattern="^(open|in_progress|resolved|closed)$")
    priority: str | None = Field(None, pattern="^(low|medium|high|critical)$")
    admin_notes: str | None = Field(None, max_length=2000)


class UserFeedback(UserFeedbackBase, TenantMixin):
    """Complete user feedback model."""

    feedback_id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    status: str = Field(default="open", pattern="^(open|in_progress|resolved|closed)$")
    admin_notes: str | None = Field(None, max_length=2000)
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# Onboarding tracking models
class OnboardingStepBase(BaseModel):
    """Base onboarding step model."""

    step_name: str = Field(..., max_length=100)
    step_order: int = Field(ge=1)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=1000)
    action_required: bool = True
    estimated_time_minutes: int | None = Field(None, ge=1)


class OnboardingStepCreate(OnboardingStepBase):
    """Onboarding step creation model."""
    pass


class OnboardingStep(OnboardingStepBase):
    """Complete onboarding step model."""

    step_id: UUID = Field(default_factory=uuid4)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


class UserOnboardingProgressBase(BaseModel):
    """Base user onboarding progress model."""

    step_id: UUID
    completed: bool = False
    completion_time_seconds: int | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=1000)


class UserOnboardingProgressCreate(UserOnboardingProgressBase):
    """User onboarding progress creation model."""
    pass


class UserOnboardingProgressUpdate(BaseModel):
    """User onboarding progress update model."""

    completed: bool | None = None
    completion_time_seconds: int | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=1000)


class UserOnboardingProgress(UserOnboardingProgressBase, TenantMixin):
    """Complete user onboarding progress model."""

    progress_id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    step: OnboardingStep | None = None  # Populated via join
    started_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# User analytics models
class UserAnalyticsEventBase(BaseModel):
    """Base user analytics event model."""

    event_type: str = Field(..., max_length=100)
    event_name: str = Field(..., max_length=100)
    page_url: str | None = Field(None, max_length=500)
    element_id: str | None = Field(None, max_length=100)
    element_text: str | None = Field(None, max_length=255)
    session_id: str | None = Field(None, max_length=255)
    user_agent: str | None = Field(None, max_length=500)
    properties: dict[str, Any] = Field(default_factory=dict)


class UserAnalyticsEventCreate(UserAnalyticsEventBase):
    """User analytics event creation model."""
    pass


class UserAnalyticsEvent(UserAnalyticsEventBase, TenantMixin):
    """Complete user analytics event model."""

    event_id: UUID = Field(default_factory=uuid4)
    user_id: UUID | None = None  # Can be anonymous
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# User testing metrics models
class UserTestingMetrics(BaseModel):
    """User testing metrics summary."""

    total_users: int = Field(ge=0)
    active_users_today: int = Field(ge=0)
    active_users_week: int = Field(ge=0)
    active_users_month: int = Field(ge=0)
    avg_session_duration_minutes: float = Field(ge=0)
    total_feedback_items: int = Field(ge=0)
    unresolved_feedback: int = Field(ge=0)
    onboarding_completion_rate: float = Field(ge=0, le=100)
    avg_onboarding_time_minutes: float = Field(ge=0)
    most_used_features: list[dict[str, Any]] = Field(default_factory=list)
    conversion_rate: float = Field(ge=0, le=100)


class OnboardingStatus(BaseModel):
    """User onboarding status summary."""

    user_id: UUID
    total_steps: int = Field(ge=0)
    completed_steps: int = Field(ge=0)
    completion_percentage: float = Field(ge=0, le=100)
    current_step: OnboardingStep | None = None
    estimated_time_remaining_minutes: int | None = Field(None, ge=0)
    started_at: datetime | None = None
    last_activity_at: datetime | None = None
