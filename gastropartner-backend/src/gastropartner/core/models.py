"""Data models för GastroPartner."""

import re
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SwedishVATRate(str, Enum):
    """Swedish VAT rates as per Skatteverket."""

    STANDARD = "25"  # 25% - Standard rate (dine-in, alcohol, etc.)
    FOOD_REDUCED = "12"  # 12% - Food takeaway, groceries
    CULTURAL = "6"  # 6% - Books, newspapers, cultural activities (rarely for restaurants)
    ZERO = "0"  # 0% - Exports, some medical services


class VATCalculationType(str, Enum):
    """VAT calculation types."""

    INCLUSIVE = "inclusive"  # Price includes VAT (Swedish default for B2C)
    EXCLUSIVE = "exclusive"  # Price excludes VAT (B2B transactions)


class TenantMixin(BaseModel):
    """Mixin för models that belong to an organization (tenant)."""

    organization_id: UUID

    # @computed_field
    # @property
    # def tenant_key(self) -> str:
    #    """Return a string key identifying the tenant."""
    #    return str(self.organization_id)

    def belongs_to_organization(self, organization_id: UUID) -> bool:
        """Check if this model belongs to the specified organization."""
        return self.organization_id == organization_id


class UserBase(BaseModel):
    """Base user model."""

    email: str = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email with support for development domains."""

        if not isinstance(v, str):
            raise ValueError("Email must be a string")

        # Basic email format validation
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email format")

        # Allow development domains
        dev_domains = [".test", ".local", ".dev", ".localhost"]
        if any(v.lower().endswith(domain) for domain in dev_domains):
            return v

        # For production domains, just return the validated email
        # (Supabase will do its own validation)
        return v


class UserCreate(UserBase):
    """User creation model."""

    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength according to security requirements."""
        # Import here to avoid circular imports
        from gastropartner.api.auth import validate_password_strength

        is_valid, error_message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_message)

        return v


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


class SystemHealthStatusBase(BaseModel):
    """Base system health status model."""

    component_name: str = Field(..., min_length=1, max_length=100)
    status: str = Field(..., pattern="^(healthy|warning|error|unknown)$")
    message: str | None = Field(None, max_length=1000)
    response_time_ms: int | None = Field(None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SystemHealthStatusCreate(SystemHealthStatusBase, TenantMixin):
    """System health status creation model with multi-tenant security."""

    pass


class SystemHealthStatusUpdate(BaseModel):
    """System health status update model."""

    status: str | None = Field(None, pattern="^(healthy|warning|error|unknown)$")
    message: str | None = Field(None, max_length=1000)
    response_time_ms: int | None = Field(None, ge=0)
    metadata: dict[str, Any] | None = None


class SystemHealthStatus(SystemHealthStatusBase, TenantMixin):
    """Complete system health status model with multi-tenant security."""

    id: UUID
    last_check_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
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


# @field_validator("cost_per_unit", mode="before")
# @classmethod
# def convert_cost_to_decimal(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


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


# @field_validator("cost_per_unit", mode="before")
# @classmethod
# def convert_cost_to_decimal(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


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
        },
    )


# Recipe ingredient models
class RecipeIngredientBase(BaseModel):
    """Base recipe ingredient model."""

    ingredient_id: UUID
    quantity: Decimal = Field(gt=0, decimal_places=3)
    unit: str = Field(..., max_length=20)
    notes: str | None = Field(None, max_length=500)


# @field_validator("quantity", mode="before")
# @classmethod
# def convert_quantity_to_decimal(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


class RecipeIngredientCreate(RecipeIngredientBase):
    """Recipe ingredient creation model."""

    pass


class RecipeIngredientUpdate(BaseModel):
    """Recipe ingredient update model."""

    quantity: Decimal | None = Field(None, gt=0, decimal_places=3)
    unit: str | None = Field(None, max_length=20)
    notes: str | None = Field(None, max_length=500)


# @field_validator("quantity", mode="before")
# @classmethod
# def convert_quantity_to_decimal(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


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
    target_food_cost_percentage: Decimal = Field(
        default=Decimal("30.0"), ge=0, le=100, decimal_places=2
    )
    vat_rate: SwedishVATRate = Field(
        default=SwedishVATRate.FOOD_REDUCED, description="Swedish VAT rate for this item"
    )
    vat_calculation_type: VATCalculationType = Field(
        default=VATCalculationType.INCLUSIVE, description="Whether price includes or excludes VAT"
    )


# @field_validator("selling_price", "target_food_cost_percentage", mode="before")
# @classmethod
# def convert_decimal_fields(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


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
    vat_rate: SwedishVATRate | None = Field(None, description="Swedish VAT rate for this item")
    vat_calculation_type: VATCalculationType | None = Field(
        None, description="Whether price includes or excludes VAT"
    )


# @field_validator("selling_price", "target_food_cost_percentage", mode="before")
# @classmethod
# def convert_decimal_fields(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


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

    # @computed_field
    # @property
    # def vat_amount(self) -> Decimal:
    #    """Calculate VAT amount based on selling price and VAT rate."""
    #    vat_rate_decimal = Decimal(self.vat_rate) / Decimal("100")
    #
    #    if self.vat_calculation_type == VATCalculationType.INCLUSIVE:
    #        # Price includes VAT: VAT = price * (rate / (100 + rate))
    #        return self.selling_price * vat_rate_decimal / (Decimal("1") + vat_rate_decimal)
    #    else:
    #        # Price excludes VAT: VAT = price * rate
    #        return self.selling_price * vat_rate_decimal

    # @computed_field
    # @property
    # def price_excluding_vat(self) -> Decimal:
    #    """Calculate price excluding VAT."""
    #    if self.vat_calculation_type == VATCalculationType.INCLUSIVE:
    #        # Remove VAT from inclusive price
    #        return self.selling_price - self.vat_amount
    #    else:
    #        # Price already excludes VAT
    #        return self.selling_price

    # @computed_field
    # @property
    # def price_including_vat(self) -> Decimal:
    #    """Calculate price including VAT."""
    #    if self.vat_calculation_type == VATCalculationType.INCLUSIVE:
    #        # Price already includes VAT
    #        return self.selling_price
    #    else:
    #        # Add VAT to exclusive price
    #        return self.selling_price + self.vat_amount

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

    # @field_validator(
    #    "total_ingredient_cost",
    #    "cost_per_serving",
    #    "selling_price",
    #    "food_cost_percentage",
    #    "margin",
    #    "margin_percentage",
    #    "target_food_cost_percentage",
    #    "recommended_selling_price",
    #    mode="before"
    # )
    # @classmethod
    # def convert_decimal_fields(cls, v):
    #    """Convert float/int/string to Decimal for proper handling."""
    #    if v is None:
    #        return v
    #    if isinstance(v, (int, float, str)):
    #        return Decimal(str(v))
    #    return v


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


# ===== ORGANIZATION SETTINGS MODELS =====


class RestaurantProfile(BaseModel):
    """Restaurant profile settings."""

    name: str = Field(..., min_length=1, max_length=255, description="Restaurant name")
    phone: str | None = Field(None, max_length=50, description="Restaurant phone number")
    timezone: str = Field(default="UTC", max_length=50, description="Restaurant timezone")
    currency: str = Field(default="SEK", max_length=10, description="Default currency code")
    address: str | None = Field(None, max_length=500, description="Restaurant address")
    website: str | None = Field(None, max_length=255, description="Restaurant website")


class BusinessSettings(BaseModel):
    """Business operation settings."""

    margin_target: Decimal = Field(
        default=Decimal("30.0"),
        ge=0,
        le=100,
        decimal_places=2,
        description="Target margin percentage",
    )
    service_charge: Decimal = Field(
        default=Decimal("0.0"),
        ge=0,
        le=100,
        decimal_places=2,
        description="Default service charge percentage",
    )
    default_prep_time: int = Field(default=30, ge=0, description="Default prep time in minutes")
    operating_hours: dict[str, Any] = Field(
        default_factory=dict, description="Operating hours by day"
    )

    # @field_validator("margin_target", "service_charge", mode="before")
    # @classmethod
    # def convert_decimal_fields(cls, v):
    #    """Convert float/int/string to Decimal for proper handling."""
    #    if v is None:
    #        return v
    #    if isinstance(v, (int, float, str)):
    #        return Decimal(str(v))
    #    return v

    model_config = ConfigDict(
        json_encoders={
            Decimal: float,  # Convert Decimal to float for JSON serialization
        }
    )


class NotificationPreferences(BaseModel):
    """Notification settings."""

    email_notifications: bool = Field(default=True, description="Enable email notifications")
    sms_notifications: bool = Field(default=False, description="Enable SMS notifications")
    inventory_alerts: bool = Field(default=True, description="Enable low inventory alerts")
    cost_alerts: bool = Field(default=True, description="Enable cost variance alerts")
    daily_reports: bool = Field(default=False, description="Enable daily summary reports")
    weekly_reports: bool = Field(default=True, description="Enable weekly summary reports")


class OrganizationSettingsBase(BaseModel):
    """Base organization settings model."""

    restaurant_profile: RestaurantProfile
    business_settings: BusinessSettings
    notification_preferences: NotificationPreferences


class OrganizationSettingsCreate(OrganizationSettingsBase):
    """Organization settings creation model."""

    pass


class OrganizationSettingsUpdate(BaseModel):
    """Organization settings update model."""

    restaurant_profile: RestaurantProfile | None = None
    business_settings: BusinessSettings | None = None
    notification_preferences: NotificationPreferences | None = None


class OrganizationSettings(OrganizationSettingsBase, TenantMixin):
    """
    Complete organization settings model with MULTI-TENANT SECURITY.

    🛡️ SECURITY: This model includes organization_id and creator_id for complete data isolation.
    All settings are scoped to a specific organization and cannot be accessed across organizations.
    """

    settings_id: UUID = Field(default_factory=uuid4, description="Unique settings identifier")
    creator_id: UUID = Field(
        ..., description="User who created these settings - REQUIRED for multi-tenant security"
    )
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        json_encoders={
            Decimal: float,  # Convert Decimal to float for JSON
        },
    )


# ===== FEATURE FLAGS MODELS =====


class FeatureFlagsBase(BaseModel):
    """
    Comprehensive feature flags model for system-wide control.

    🛡️ MULTI-TENANT SECURITY: All flags are scoped to organizations.
    Only system administrators can modify these flags globally.
    """

    # ===== MODULES & PAGES =====
    show_ingredients: bool = True
    show_recipes: bool = True
    show_menu_items: bool = True
    show_sales: bool = False
    show_inventory: bool = False
    show_reports: bool = True
    show_analytics: bool = False
    show_suppliers: bool = False

    # Recipe-specific features
    show_recipe_prep_time: bool = False
    show_recipe_cook_time: bool = False
    show_recipe_instructions: bool = False
    show_recipe_notes: bool = False

    # ===== UI COMPONENTS =====
    enable_dark_mode: bool = True
    enable_mobile_app_banner: bool = False
    enable_quick_actions: bool = True
    enable_dashboard_widgets: bool = True
    enable_advanced_search: bool = False
    enable_data_export: bool = False
    enable_bulk_operations: bool = False

    # Settings page sections
    enable_notifications_section: bool = True
    enable_advanced_settings_section: bool = False
    enable_account_management_section: bool = False
    enable_company_profile_section: bool = True
    enable_business_settings_section: bool = True
    enable_settings_header: bool = True
    enable_settings_footer: bool = True

    # ===== SYSTEM FEATURES =====
    enable_api_access: bool = False
    enable_webhooks: bool = False
    enable_email_notifications: bool = True
    enable_sms_notifications: bool = False
    enable_push_notifications: bool = False
    enable_multi_language: bool = False
    enable_offline_mode: bool = False

    # ===== LIMITS & QUOTAS =====
    max_ingredients_limit: int = Field(default=50, ge=0, le=10000)
    max_recipes_limit: int = Field(default=25, ge=0, le=10000)
    max_menu_items_limit: int = Field(default=100, ge=0, le=10000)
    max_users_per_org: int = Field(default=5, ge=1, le=1000)
    api_rate_limit: int = Field(default=100, ge=10, le=10000)  # requests per minute
    storage_quota_mb: int = Field(default=100, ge=10, le=100000)  # MB

    # ===== BETA FEATURES =====
    enable_ai_suggestions: bool = False
    enable_predictive_analytics: bool = False
    enable_voice_commands: bool = False
    enable_automated_ordering: bool = False
    enable_advanced_pricing: bool = False
    enable_customer_portal: bool = False

    # ===== INTEGRATIONS =====
    enable_pos_integration: bool = False
    enable_accounting_sync: bool = False
    enable_delivery_platforms: bool = False
    enable_payment_processing: bool = False
    enable_loyalty_programs: bool = False


class FeatureFlagsUpdate(BaseModel):
    """Feature flags update model - allows partial updates of any feature flag."""

    # ===== MODULES & PAGES =====
    show_ingredients: bool | None = None
    show_recipes: bool | None = None
    show_menu_items: bool | None = None
    show_sales: bool | None = None
    show_inventory: bool | None = None
    show_reports: bool | None = None
    show_analytics: bool | None = None
    show_suppliers: bool | None = None

    # Recipe-specific features
    show_recipe_prep_time: bool | None = None
    show_recipe_cook_time: bool | None = None
    show_recipe_instructions: bool | None = None
    show_recipe_notes: bool | None = None

    # ===== UI COMPONENTS =====
    enable_dark_mode: bool | None = None
    enable_mobile_app_banner: bool | None = None
    enable_quick_actions: bool | None = None
    enable_dashboard_widgets: bool | None = None
    enable_advanced_search: bool | None = None
    enable_data_export: bool | None = None
    enable_bulk_operations: bool | None = None

    # Settings page sections
    enable_notifications_section: bool | None = None
    enable_advanced_settings_section: bool | None = None
    enable_account_management_section: bool | None = None
    enable_company_profile_section: bool | None = None
    enable_business_settings_section: bool | None = None
    enable_settings_header: bool | None = None
    enable_settings_footer: bool | None = None

    # ===== SYSTEM FEATURES =====
    enable_api_access: bool | None = None
    enable_webhooks: bool | None = None
    enable_email_notifications: bool | None = None
    enable_sms_notifications: bool | None = None
    enable_push_notifications: bool | None = None
    enable_multi_language: bool | None = None
    enable_offline_mode: bool | None = None

    # ===== LIMITS & QUOTAS =====
    max_ingredients_limit: int | None = Field(default=None, ge=0, le=10000)
    max_recipes_limit: int | None = Field(default=None, ge=0, le=10000)
    max_menu_items_limit: int | None = Field(default=None, ge=0, le=10000)
    max_users_per_org: int | None = Field(default=None, ge=1, le=1000)
    api_rate_limit: int | None = Field(default=None, ge=10, le=10000)
    storage_quota_mb: int | None = Field(default=None, ge=10, le=100000)

    # ===== BETA FEATURES =====
    enable_ai_suggestions: bool | None = None
    enable_predictive_analytics: bool | None = None
    enable_voice_commands: bool | None = None
    enable_automated_ordering: bool | None = None
    enable_advanced_pricing: bool | None = None
    enable_customer_portal: bool | None = None

    # ===== INTEGRATIONS =====
    enable_pos_integration: bool | None = None
    enable_accounting_sync: bool | None = None
    enable_delivery_platforms: bool | None = None
    enable_payment_processing: bool | None = None
    enable_loyalty_programs: bool | None = None


class FeatureFlagsTemplate(BaseModel):
    """
    Feature flags template/preset model.

    Templates allow quick application of predefined feature flag configurations.
    """

    template_id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=100, description="Template name")
    description: str = Field(..., min_length=1, max_length=500, description="Template description")
    category: str = Field(
        ..., description="Template category (freemium, premium, enterprise, custom)"
    )
    is_system_template: bool = Field(
        default=False, description="Whether this is a built-in system template"
    )

    # The actual feature flags configuration
    flags_config: FeatureFlagsBase

    created_by: UUID = Field(..., description="User who created this template")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


class FeatureFlagsGlobal(BaseModel):
    """
    Global feature flags defaults that apply system-wide.

    These serve as defaults for new organizations unless overridden.
    Only system administrators can modify these.
    """

    global_id: UUID = Field(default_factory=uuid4)
    flags_config: FeatureFlagsBase

    # Metadata
    created_by: UUID = Field(..., description="System admin who created these defaults")
    last_updated_by: UUID = Field(..., description="System admin who last updated these")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


class FeatureFlagAuditLog(BaseModel):
    """
    Audit log for feature flag changes.

    Tracks all changes to feature flags for compliance and debugging.
    """

    audit_id: UUID = Field(default_factory=uuid4)
    organization_id: UUID = Field(..., description="Organization affected by the change")

    # Change details
    changed_by: UUID = Field(..., description="User who made the change")
    change_type: str = Field(
        ..., description="Type of change: create, update, delete, template_apply"
    )

    # What changed
    field_name: str | None = Field(None, description="Specific field that changed")
    old_value: str | None = Field(None, description="Previous value (JSON serialized)")
    new_value: str | None = Field(None, description="New value (JSON serialized)")

    # Context
    template_used: str | None = Field(None, description="Template name if applied via template")
    reason: str | None = Field(None, max_length=500, description="Reason for the change")

    # Metadata
    user_agent: str | None = Field(None, description="User agent of the request")
    ip_address: str | None = Field(None, description="IP address of the request")

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


class FeatureFlags(FeatureFlagsBase, TenantMixin):
    """Complete feature flags model."""

    flags_id: UUID = Field(default_factory=uuid4)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# Task/Case Management Models
class TaskStatus(str, Enum):
    """Task status enumeration."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"


class TaskPriority(str, Enum):
    """Task priority enumeration."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskBase(BaseModel):
    """Base task model."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: datetime | None = None
    assigned_to: UUID | None = None
    category: str | None = Field(None, max_length=100)
    tags: list[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    """Task creation model."""

    pass


class TaskUpdate(BaseModel):
    """Task update model."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    assigned_to: UUID | None = None
    category: str | None = Field(None, max_length=100)
    tags: list[str] | None = None


class Task(TaskBase, TenantMixin):
    """Complete task model."""

    task_id: UUID = Field(default_factory=uuid4)
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ===== SALES MODELS =====


class SaleBase(BaseModel):
    """Base sale model."""

    sale_date: datetime = Field(..., description="Date of the sale")
    total_amount: Decimal = Field(..., ge=0, decimal_places=2, description="Total sale amount")
    notes: str | None = Field(None, max_length=1000, description="Optional notes about the sale")


# @field_validator("total_amount", mode="before")
# @classmethod
# def convert_total_amount_to_decimal(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


class SaleCreate(SaleBase):
    """Sale creation model."""

    pass


class SaleUpdate(BaseModel):
    """Sale update model."""

    sale_date: datetime | None = None
    total_amount: Decimal | None = Field(None, ge=0, decimal_places=2)
    notes: str | None = Field(None, max_length=1000)


# @field_validator("total_amount", mode="before")
# @classmethod
# def convert_total_amount_to_decimal(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


class Sale(SaleBase, TenantMixin):
    """
    Complete sale model with MULTI-TENANT SECURITY.

    🛡️ SECURITY: This model includes organization_id and creator_id for complete data isolation.
    All sales are scoped to a specific organization and cannot be accessed across organizations.
    """

    sale_id: UUID = Field(default_factory=uuid4, description="Unique sale identifier")
    creator_id: UUID = Field(
        ..., description="User who created this sale - REQUIRED for multi-tenant security"
    )
    created_at: datetime
    updated_at: datetime

    # Relationship fields (populated via joins)
    sale_items: list["SaleItem"] = Field(
        default_factory=list, description="Sale items associated with this sale"
    )

    # @computed_field
    # @property
    # def total_vat_amount(self) -> Decimal:
    #    """Calculate total VAT amount from all sale items."""
    #    return sum(item.vat_amount for item in self.sale_items)

    # @computed_field
    # @property
    # def total_excluding_vat(self) -> Decimal:
    #    """Calculate total amount excluding VAT."""
    #    return self.total_amount - self.total_vat_amount

    # @computed_field
    # @property
    # def vat_breakdown(self) -> dict[str, Decimal]:
    #    """Breakdown of VAT amounts by rate."""
    #    breakdown = {}
    #    for item in self.sale_items:
    #        rate = item.vat_rate
    #        if rate not in breakdown:
    #            breakdown[rate] = Decimal("0")
    #        breakdown[rate] += item.vat_amount
    #    return breakdown

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        json_encoders={
            Decimal: float,  # Convert Decimal to float for JSON serialization
        },
    )


class SaleItemBase(BaseModel):
    """Base sale item model."""

    product_type: str = Field(
        ..., pattern="^(recipe|menu_item)$", description="Type of product sold: recipe or menu_item"
    )
    product_id: UUID = Field(..., description="ID of the recipe or menu item sold")
    quantity_sold: Decimal = Field(
        ..., gt=0, decimal_places=3, description="Quantity of product sold"
    )
    unit_price: Decimal = Field(..., ge=0, decimal_places=2, description="Price per unit sold")
    total_price: Decimal = Field(
        ..., ge=0, decimal_places=2, description="Total price for this line item"
    )
    vat_rate: SwedishVATRate = Field(
        default=SwedishVATRate.FOOD_REDUCED, description="Swedish VAT rate applied"
    )
    vat_amount: Decimal = Field(
        ..., ge=0, decimal_places=2, description="VAT amount for this line item"
    )


# @field_validator("quantity_sold", "unit_price", "total_price", "vat_amount", mode="before")
# @classmethod
# def convert_decimal_fields(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


class SaleItemCreate(SaleItemBase):
    """Sale item creation model."""

    pass


class SaleItemUpdate(BaseModel):
    """Sale item update model."""

    product_type: str | None = Field(None, pattern="^(recipe|menu_item)$")
    product_id: UUID | None = None
    quantity_sold: Decimal | None = Field(None, gt=0, decimal_places=3)
    unit_price: Decimal | None = Field(None, ge=0, decimal_places=2)
    total_price: Decimal | None = Field(None, ge=0, decimal_places=2)
    vat_rate: SwedishVATRate | None = Field(None, description="Swedish VAT rate applied")
    vat_amount: Decimal | None = Field(
        None, ge=0, decimal_places=2, description="VAT amount for this line item"
    )


# @field_validator("quantity_sold", "unit_price", "total_price", "vat_amount", mode="before")
# @classmethod
# def convert_decimal_fields(cls, v):
#    """Convert float/int/string to Decimal for proper handling."""
#    if v is None:
#        return v
#    if isinstance(v, (int, float, str)):
#        return Decimal(str(v))
#    return v


class SaleItem(SaleItemBase):
    """
    Complete sale item model.

    🛡️ SECURITY: Sale items are indirectly secured through their parent Sale's organization_id.
    Each sale item must belong to a sale that belongs to the user's organization.
    """

    sale_item_id: UUID = Field(default_factory=uuid4, description="Unique sale item identifier")
    sale_id: UUID = Field(..., description="ID of the parent sale")
    product_name: str | None = Field(
        None, max_length=255, description="Name of the product (populated from recipe/menu_item)"
    )
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        json_encoders={
            Decimal: float,  # Convert Decimal to float for JSON serialization
        },
    )


# ================================
# Reports Models
# ================================


class ProfitabilityReport(BaseModel):
    """Lönsamhetsanalys rapport."""

    period_start: datetime = Field(..., description="Start date for the report period")
    period_end: datetime = Field(..., description="End date for the report period")
    total_revenue: Decimal = Field(..., ge=0, description="Total revenue for the period")
    total_cost: Decimal = Field(..., ge=0, description="Total cost for the period")
    profit: Decimal = Field(..., description="Net profit (revenue - cost)")
    profit_margin_percentage: Decimal = Field(..., description="Profit margin as percentage")
    total_sales_count: int = Field(..., ge=0, description="Number of sales transactions")
    average_sale_value: Decimal = Field(..., ge=0, description="Average value per sale")

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: float,
        },
    )


class ProductProfitability(BaseModel):
    """Produktlönsamhet rapport."""

    product_id: UUID = Field(..., description="Product (recipe or menu_item) ID")
    product_name: str = Field(..., description="Product name")
    product_type: str = Field(..., description="Type: 'recipe' or 'menu_item'")
    units_sold: int = Field(..., ge=0, description="Number of units sold")
    revenue: Decimal = Field(..., ge=0, description="Total revenue from this product")
    estimated_cost: Decimal = Field(..., ge=0, description="Estimated cost per unit")
    profit: Decimal = Field(..., description="Total profit from this product")
    profit_margin_percentage: Decimal = Field(..., description="Profit margin as percentage")

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: float,
        },
    )


class SalesReport(BaseModel):
    """Försäljningsrapport."""

    period_start: datetime = Field(..., description="Start date for the report period")
    period_end: datetime = Field(..., description="End date for the report period")
    total_sales: int = Field(..., ge=0, description="Total number of sales")
    total_revenue: Decimal = Field(..., ge=0, description="Total revenue")
    daily_breakdown: list[dict[str, Any]] = Field(
        default_factory=list, description="Daily sales breakdown"
    )
    product_breakdown: list[ProductProfitability] = Field(
        default_factory=list, description="Sales by product"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: float,
        },
    )
