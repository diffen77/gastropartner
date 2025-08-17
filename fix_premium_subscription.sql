-- Fix premium subscription for development organization
-- This updates the subscription tier to premium so users get the expected limits:
-- Premium: 50 ingredients, 5 recipes, 2 menu items

-- Update the development organization to premium tier
UPDATE organizations 
SET subscription_tier = 'premium' 
WHERE organization_id = '87654321-4321-4321-4321-210987654321';

-- Verify the update
SELECT organization_id, name, subscription_tier, max_ingredients, max_recipes, max_menu_items 
FROM organizations 
WHERE organization_id = '87654321-4321-4321-4321-210987654321';