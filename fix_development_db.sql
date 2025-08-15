-- Fix for development ingredient creation issue
-- Creates the development organization and user that the authentication system expects

-- Insert development organization if it doesn't exist
INSERT INTO organizations (
    organization_id,
    name,
    slug,
    subscription_tier,
    max_ingredients,
    max_recipes,
    max_menu_items,
    is_active
) VALUES (
    '87654321-4321-4321-4321-210987654321',
    'Development Organization',
    'dev-org',
    'freemium',
    50,
    25,
    100,
    true
) ON CONFLICT (organization_id) DO NOTHING;

-- Insert development user if needed (for organization_users table)
INSERT INTO organization_users (
    user_id,
    organization_id,
    role,
    joined_at
) VALUES (
    '12345678-1234-1234-1234-123456789012',
    '87654321-4321-4321-4321-210987654321',
    'admin',
    NOW()
) ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Grant necessary permissions (if RLS policies require specific user access)
-- This may need to be adjusted based on your specific RLS policies