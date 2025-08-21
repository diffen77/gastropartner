"""
Module subscriptions API endpoints.

🚨 CRITICAL SECURITY: MULTI-TENANT DATA ISOLATION
- ALL endpoints MUST filter by organization_id from get_user_organization() dependency
- NEVER allow cross-organization data access
- This implements secure module subscription management
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid

from ..core.auth import get_user_organization, get_current_active_user
from ..core.database import get_supabase_client
from ..core.models import User
from uuid import UUID

router = APIRouter(prefix="/modules", tags=["modules"])

# Module subscription models
class ModuleSubscription(BaseModel):
    id: str
    module_name: str
    tier: str
    organization_id: str
    user_id: str
    active: bool
    price: float
    currency: str
    activated_at: datetime
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

class ModuleActivationRequest(BaseModel):
    module_name: str
    tier: str

@router.get("/subscriptions", response_model=List[ModuleSubscription])
async def get_module_subscriptions(
    organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Get active module subscriptions for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('module_subscriptions').select('*').eq(
            'organization_id', organization_id
        ).eq('active', True).execute()
        
        if not result.data:
            return []
        
        subscriptions = []
        for item in result.data:
            # Convert string datetimes to datetime objects
            activated_at = datetime.fromisoformat(item['activated_at'].replace('Z', '+00:00'))
            expires_at = None
            if item.get('expires_at'):
                expires_at = datetime.fromisoformat(item['expires_at'].replace('Z', '+00:00'))
            created_at = datetime.fromisoformat(item['created_at'].replace('Z', '+00:00'))
            updated_at = datetime.fromisoformat(item['updated_at'].replace('Z', '+00:00'))
            
            subscription = ModuleSubscription(
                id=item['id'],
                module_name=item['module_name'],
                tier=item['tier'],
                organization_id=item['organization_id'],
                user_id=item['user_id'],
                active=item['active'],
                price=float(item['price']),
                currency=item['currency'],
                activated_at=activated_at,
                expires_at=expires_at,
                created_at=created_at,
                updated_at=updated_at
            )
            subscriptions.append(subscription)
        
        return subscriptions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch module subscriptions: {str(e)}")

@router.post("/subscriptions/activate", response_model=Dict[str, Any])
async def activate_module(
    request: ModuleActivationRequest,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Activate a module subscription for the current organization.
    Creates subscription with organization_id for multi-tenant isolation.
    """
    supabase = get_supabase_client()
    
    # Price mapping for each tier
    prices = {
        'ingredients': {'free': 0, 'pro': 299},
        'recipes': {'free': 0, 'pro': 299},
        'menu': {'free': 0, 'pro': 299},
        'analytics': {'free': 0, 'pro': 299},
        'user_testing': {'free': 0, 'pro': 199},
        'super_admin': {'free': 0, 'pro': 399},
        'sales': {'free': 0, 'pro': 499},
        'advanced_analytics': {'free': 0, 'pro': 599},
        'mobile_app': {'free': 0, 'pro': 199},
        'integrations': {'free': 0, 'pro': 399}
    }
    
    try:
        # Get price for the module and tier
        price = prices.get(request.module_name, {}).get(request.tier, 0)
        
        # Check if module is already activated
        existing_result = supabase.table('module_subscriptions').select('*').eq(
            'organization_id', organization_id
        ).eq('module_name', request.module_name).eq('active', True).execute()
        
        # Deactivate existing subscription if upgrading/downgrading
        if existing_result.data:
            existing = existing_result.data[0]
            if existing['tier'] == request.tier:
                return {"success": True, "message": f"Module {request.module_name} already activated with tier {request.tier}"}
            
            # Deactivate old subscription
            supabase.table('module_subscriptions').update({
                'active': False,
                'updated_at': datetime.now().isoformat()
            }).eq('id', existing['id']).execute()
        
        # Create new subscription
        expires_at = None
        if request.tier == 'pro':
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        new_subscription = {
            'id': str(uuid.uuid4()),
            'module_name': request.module_name,
            'tier': request.tier,
            'organization_id': organization_id,
            'user_id': str(current_user.id),  # Use current user as creator
            'active': True,
            'price': price,
            'currency': 'SEK',
            'activated_at': datetime.now().isoformat(),
            'expires_at': expires_at,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('module_subscriptions').insert(new_subscription).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create module subscription")
        
        return {
            "success": True,
            "message": f"Successfully activated {request.module_name} with {request.tier} tier",
            "subscription": result.data[0]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate module: {str(e)}")

@router.post("/subscriptions/{module_name}/deactivate", response_model=Dict[str, Any])
async def deactivate_module(
    module_name: str,
    organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Deactivate a module subscription for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()
    
    try:
        # Find and deactivate the active subscription
        result = supabase.table('module_subscriptions').update({
            'active': False,
            'updated_at': datetime.now().isoformat()
        }).eq('organization_id', organization_id).eq(
            'module_name', module_name
        ).eq('active', True).execute()
        
        return {
            "success": True,
            "message": f"Successfully deactivated {module_name}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate module: {str(e)}")

@router.get("/subscriptions/{module_name}/status", response_model=Dict[str, Any])
async def get_module_status(
    module_name: str,
    organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Get status of a specific module for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('module_subscriptions').select('*').eq(
            'organization_id', organization_id
        ).eq('module_name', module_name).eq('active', True).execute()
        
        if result.data:
            subscription = result.data[0]
            return {
                "tier": subscription['tier'],
                "active": subscription['active'],
                "expires_at": subscription.get('expires_at'),
                "price": float(subscription['price'])
            }
        else:
            return {
                "tier": None,
                "active": False,
                "expires_at": None,
                "price": 0
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get module status: {str(e)}")