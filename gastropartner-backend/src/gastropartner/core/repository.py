"""Base repository pattern för multitenant data access."""

from abc import ABC
from typing import Any, Generic, TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from supabase import Client

# Type variables for generic repository
ModelType = TypeVar("ModelType", bound=BaseModel)
CreateType = TypeVar("CreateType", bound=BaseModel)
UpdateType = TypeVar("UpdateType", bound=BaseModel)


class BaseRepository(ABC, Generic[ModelType, CreateType, UpdateType]):
    """Base repository with tenant isolation."""

    def __init__(
        self,
        supabase: Client,
        table_name: str,
        model_class: type[ModelType],
        primary_key: str = "id",
    ):
        self.supabase = supabase
        self.table_name = table_name
        self.model_class = model_class
        self.primary_key = primary_key

    def _to_model(self, data: dict[str, Any]) -> ModelType:
        """Convert database row to model instance."""
        return self.model_class(**data)

    async def create(
        self,
        data: CreateType,
        organization_id: UUID,
        additional_fields: dict[str, Any] | None = None,
    ) -> ModelType:
        """Create new record with tenant isolation."""
        create_data = data.model_dump(exclude_unset=True)
        create_data["organization_id"] = str(organization_id)

        if additional_fields:
            create_data.update(additional_fields)

        try:
            response = self.supabase.table(self.table_name).insert(create_data).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create {self.table_name[:-1]}"
                )

            return self._to_model(response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def get_by_id(
        self,
        record_id: UUID,
        organization_id: UUID,
    ) -> ModelType:
        """Get record by ID with tenant isolation."""
        try:
            response = self.supabase.table(self.table_name).select("*").eq(
                self.primary_key, str(record_id)
            ).eq("organization_id", str(organization_id)).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.table_name[:-1].title()} not found"
                )

            return self._to_model(response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def list(
        self,
        organization_id: UUID,
        filters: dict[str, Any] | None = None,
        limit: int = 100,
        offset: int = 0,
        order_by: str | None = None,
    ) -> list[ModelType]:
        """List records with tenant isolation."""
        try:
            query = self.supabase.table(self.table_name).select("*").eq(
                "organization_id", str(organization_id)
            )

            if filters:
                for key, value in filters.items():
                    if value is not None:
                        query = query.eq(key, value)

            if order_by:
                query = query.order(order_by)

            query = query.range(offset, offset + limit - 1)
            response = query.execute()

            return [self._to_model(item) for item in response.data]

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def update(
        self,
        record_id: UUID,
        data: UpdateType,
        organization_id: UUID,
    ) -> ModelType:
        """Update record with tenant isolation."""
        # First verify record exists and belongs to organization
        await self.get_by_id(record_id, organization_id)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            # No changes, return current record
            return await self.get_by_id(record_id, organization_id)

        update_data["updated_at"] = "now()"

        try:
            response = self.supabase.table(self.table_name).update(update_data).eq(
                self.primary_key, str(record_id)
            ).eq("organization_id", str(organization_id)).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update {self.table_name[:-1]}"
                )

            return self._to_model(response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def delete(
        self,
        record_id: UUID,
        organization_id: UUID,
        soft_delete: bool = True,
    ) -> bool:
        """Delete record with tenant isolation."""
        # First verify record exists and belongs to organization
        await self.get_by_id(record_id, organization_id)

        try:
            if soft_delete:
                # Soft delete by setting is_active = false
                response = self.supabase.table(self.table_name).update({
                    "is_active": False,
                    "updated_at": "now()"
                }).eq(self.primary_key, str(record_id)).eq(
                    "organization_id", str(organization_id)
                ).execute()
            else:
                # Hard delete
                response = self.supabase.table(self.table_name).delete().eq(
                    self.primary_key, str(record_id)
                ).eq("organization_id", str(organization_id)).execute()

            return response.data is not None

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def count(
        self,
        organization_id: UUID,
        filters: dict[str, Any] | None = None,
    ) -> int:
        """Count records with tenant isolation."""
        try:
            query = self.supabase.table(self.table_name).select(
                self.primary_key, count="exact"
            ).eq("organization_id", str(organization_id))

            if filters:
                for key, value in filters.items():
                    if value is not None:
                        query = query.eq(key, value)

            response = query.execute()
            return response.count or 0

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e


class IngredientRepository(BaseRepository[Any, Any, Any]):
    """Repository för ingredients."""

    def __init__(self, supabase: Client):
        from gastropartner.core.models import Ingredient
        super().__init__(
            supabase=supabase,
            table_name="ingredients",
            model_class=Ingredient,
            primary_key="ingredient_id",
        )

    async def get_categories(self, organization_id: UUID) -> list[str]:
        """Get all ingredient categories for organization."""
        try:
            response = self.supabase.table("ingredients").select("category").eq(
                "organization_id", str(organization_id)
            ).eq("is_active", True).execute()

            # Extract unique categories, filter out nulls
            categories = list(set(
                item["category"] for item in response.data
                if item["category"] is not None
            ))

            return sorted(categories)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e


class RecipeRepository(BaseRepository[Any, Any, Any]):
    """Repository för recipes."""

    def __init__(self, supabase: Client):
        from gastropartner.core.models import Recipe
        super().__init__(
            supabase=supabase,
            table_name="recipes",
            model_class=Recipe,
            primary_key="recipe_id",
        )

    async def get_with_ingredients(
        self,
        recipe_id: UUID,
        organization_id: UUID,
    ) -> Any:
        """Get recipe with its ingredients."""
        try:
            # Get recipe with ingredients via join
            response = self.supabase.table("recipes").select("""
                *,
                recipe_ingredients (
                    *,
                    ingredients (*)
                )
            """).eq("recipe_id", str(recipe_id)).eq(
                "organization_id", str(organization_id)
            ).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipe not found"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e


class MenuItemRepository(BaseRepository[Any, Any, Any]):
    """Repository för menu items."""

    def __init__(self, supabase: Client):
        from gastropartner.core.models import MenuItem
        super().__init__(
            supabase=supabase,
            table_name="menu_items",
            model_class=MenuItem,
            primary_key="menu_item_id",
        )

    async def get_with_recipe(
        self,
        menu_item_id: UUID,
        organization_id: UUID,
    ) -> Any:
        """Get menu item with its recipe."""
        try:
            response = self.supabase.table("menu_items").select("""
                *,
                recipes (
                    *,
                    recipe_ingredients (
                        *,
                        ingredients (*)
                    )
                )
            """).eq("menu_item_id", str(menu_item_id)).eq(
                "organization_id", str(organization_id)
            ).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Menu item not found"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e


class OrganizationRepository:
    """Repository för organizations."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def get_by_id(self, organization_id: UUID, user_id: UUID) -> Any:
        """Get organization by ID if user has access."""
        try:
            response = self.supabase.table("organizations").select("*").eq(
                "organization_id", str(organization_id)
            ).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization not found"
                )

            # Verify user has access to this organization
            access_response = self.supabase.table("organization_users").select(
                "role"
            ).eq("organization_id", str(organization_id)).eq(
                "user_id", str(user_id)
            ).execute()

            if not access_response.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to organization"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def get_user_organizations(self, user_id: UUID) -> list[dict[str, Any]]:
        """Get all organizations for a user."""
        try:
            response = self.supabase.table("organization_users").select("""
                role,
                joined_at,
                organizations (*)
            """).eq("user_id", str(user_id)).execute()

            return response.data

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e


class FeatureFlagsRepository(BaseRepository[Any, Any, Any]):
    """Repository for feature flags."""

    def __init__(self, supabase: Client):
        from gastropartner.core.models import FeatureFlags
        super().__init__(
            supabase=supabase,
            table_name="feature_flags",
            model_class=FeatureFlags,
            primary_key="flags_id",
        )

    async def get_or_create_for_agency(self, agency_id: str) -> Any:
        """Get feature flags for agency, creating default if not exists."""
        try:
            # Try to get existing feature flags
            response = self.supabase.table("feature_flags").select("*").eq(
                "agency_id", agency_id
            ).execute()

            if response.data:
                return response.data[0]

            # Create default feature flags if none exist
            default_flags = {
                "agency_id": agency_id,
                "show_recipe_prep_time": False,
                "show_recipe_cook_time": False,
                "show_recipe_instructions": False,
                "show_recipe_notes": False,
            }

            create_response = self.supabase.table("feature_flags").insert(
                default_flags
            ).execute()

            return create_response.data[0]

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e

    async def update_for_agency(self, agency_id: str, updates: dict[str, Any]) -> Any:
        """Update feature flags for agency."""
        try:
            # Ensure feature flags exist first
            await self.get_or_create_for_agency(agency_id)

            # Update the flags
            response = self.supabase.table("feature_flags").update(
                updates
            ).eq("agency_id", agency_id).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Feature flags not found"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e!s}"
            ) from e
