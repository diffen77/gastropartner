#!/usr/bin/env python3
"""
Test script to verify premium subscription limits are working correctly.
Run this to test the freemium service behavior with different subscription tiers.
"""

import asyncio
import os
from uuid import UUID
import sys
sys.path.insert(0, 'gastropartner-backend/src')

from gastropartner.core.freemium import FreemiumService
from supabase import create_client

async def test_subscription_tiers():
    """Test different subscription tier limits."""
    
    # Initialize Supabase client (you'll need to set these environment variables)
    supabase_url = os.getenv("SUPABASE_URL", "https://gamkayswexhlshuepnei.supabase.co")
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "")
    
    if not supabase_key:
        print("❌ SUPABASE_ANON_KEY not set. Cannot test database connection.")
        return
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        freemium_service = FreemiumService(supabase)
        
        # Test with development organization
        dev_org_id = UUID("87654321-4321-4321-4321-210987654321")
        
        print("🧪 Testing FreemiumService subscription tier logic...")
        print("=" * 60)
        
        # Test limits calculation
        limits = await freemium_service.get_organization_limits(dev_org_id)
        print(f"📊 Organization limits: {limits}")
        
        # Test usage summary
        usage_summary = await freemium_service.get_usage_summary(dev_org_id)
        print(f"📈 Usage summary - Plan: {usage_summary['plan']}")
        print(f"   Ingredients: {usage_summary['usage']['ingredients']['current']}/{usage_summary['usage']['ingredients']['limit']}")
        print(f"   Recipes: {usage_summary['usage']['recipes']['current']}/{usage_summary['usage']['recipes']['limit']}")
        print(f"   Menu Items: {usage_summary['usage']['menu_items']['current']}/{usage_summary['usage']['menu_items']['limit']}")
        
        # Check what tier gives what limits
        print("\n🔍 Expected behavior:")
        print("   - freemium: 7 ingredients, 2 recipes, 1 menu item")
        print("   - premium: 50 ingredients, 5 recipes, 2 menu items")
        print("   - enterprise: 10000 ingredients, 1000 recipes, 1000 menu items")
        
        print(f"\n✅ Current plan '{usage_summary['plan']}' should give premium limits")
        
    except Exception as e:
        print(f"❌ Error testing: {e}")

if __name__ == "__main__":
    asyncio.run(test_subscription_tiers())