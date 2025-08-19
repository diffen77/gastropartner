#!/usr/bin/env python3
"""
Test script to verify ingredient persistence fix.
This reproduces the bug described in the task and verifies the fix.
"""

import asyncio
import json
from datetime import UTC, datetime
from decimal import Decimal

from gastropartner.api.ingredients import create_ingredient, list_ingredients
from gastropartner.core.database import get_supabase_admin_client, get_supabase_client
from gastropartner.core.models import IngredientCreate, User


async def test_ingredient_persistence():
    """Test that ingredients are properly persisted to database."""
    print("🧪 Testing ingredient persistence fix...")

    # Try admin client first to bypass RLS for testing
    supabase = get_supabase_admin_client()
    if supabase is None:
        print("⚠️  No admin client available, using regular client")
        supabase = get_supabase_client()

        # Set the JWT context for RLS to work
        # This simulates proper authentication
        try:
            # Use development token pattern from auth.py
            supabase.auth.set_session({
                'access_token': 'dev_token_dev_example_com',
                'refresh_token': 'mock_refresh',
                'token_type': 'Bearer',
                'expires_in': 3600
            })
        except Exception as e:
            print(f"⚠️  Could not set auth session: {e}")

    # Create mock user (development user)
    mock_user = User(
        id="12345678-1234-1234-1234-123456789012",
        email="dev@example.com",
        full_name="Development User",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        email_confirmed_at=datetime.now(UTC),
        last_sign_in_at=datetime.now(UTC)
    )

    # Get organization ID (this should return development org ID)
    from uuid import UUID

    # Development organization ID from auth.py
    organization_id = UUID("87654321-4321-4321-4321-210987654321")

    print(f"📋 Using organization ID: {organization_id}")

    # Test 1: Count ingredients before creation
    initial_ingredients = supabase.table("ingredients").select(
        "*"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    initial_count = len(initial_ingredients.data)
    print(f"📊 Initial ingredient count: {initial_count}")

    # Test 2: Create a test ingredient
    test_ingredient = IngredientCreate(
        name="Test Lök",
        category="Grönsaker",
        unit="kg",
        cost_per_unit=Decimal("25.50"),
        supplier="Test Supplier",
        notes="Test ingredient for persistence verification"
    )

    print(f"🧄 Creating ingredient: {test_ingredient.name}")

    try:
        # Create ingredient using the API function
        created_ingredient = await create_ingredient(
            ingredient_data=test_ingredient,
            current_user=mock_user,
            organization_id=organization_id,
            supabase=supabase
        )

        print(f"✅ Ingredient created with ID: {created_ingredient.ingredient_id}")
        print(f"📋 Created ingredient data: {json.dumps({
            'id': str(created_ingredient.ingredient_id),
            'name': created_ingredient.name,
            'category': created_ingredient.category,
            'cost': str(created_ingredient.cost_per_unit)
        }, indent=2)}")

    except Exception as e:
        print(f"❌ Failed to create ingredient: {e}")
        return False

    # Test 3: Verify ingredient was persisted to database
    print("🔍 Verifying persistence...")

    final_ingredients = supabase.table("ingredients").select(
        "*"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    final_count = len(final_ingredients.data)
    print(f"📊 Final ingredient count: {final_count}")

    # Check if count increased
    if final_count > initial_count:
        print("✅ SUCCESS: Ingredient count increased - persistence working!")

        # Find our created ingredient
        created_in_db = None
        for ingredient in final_ingredients.data:
            if ingredient["name"] == test_ingredient.name:
                created_in_db = ingredient
                break

        if created_in_db:
            print("✅ SUCCESS: Found created ingredient in database!")
            print(f"📋 Database record: {json.dumps({
                'id': created_in_db['ingredient_id'],
                'name': created_in_db['name'],
                'category': created_in_db['category'],
                'cost': created_in_db['cost_per_unit']
            }, indent=2)}")
        else:
            print("⚠️  WARNING: Count increased but couldn't find exact ingredient")

        # Test 4: Test API list endpoint
        print("🔍 Testing list API endpoint...")
        try:
            api_ingredients = await list_ingredients(
                organization_id=organization_id,
                supabase=supabase
            )

            print(f"📊 API returned {len(api_ingredients)} ingredients")
            if len(api_ingredients) > 0:
                print("✅ SUCCESS: API list endpoint working!")
                for ing in api_ingredients[:3]:  # Show first 3
                    print(f"  - {ing.name} ({ing.category})")
            else:
                print("⚠️  WARNING: API returned empty list")

        except Exception as e:
            print(f"❌ API list error: {e}")

        return True

    else:
        print(f"❌ FAILURE: Ingredient count didn't increase ({initial_count} -> {final_count})")
        print("🐛 BUG: Ingredients not being persisted to database!")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_ingredient_persistence())
    if success:
        print("\n🎉 PERSISTENCE FIX VERIFIED!")
    else:
        print("\n💥 PERSISTENCE ISSUE STILL EXISTS!")
