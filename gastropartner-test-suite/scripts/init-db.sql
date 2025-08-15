-- GastroPartner Test Database Initialization
-- Creates tables and test data for automated testing

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create test schema
CREATE SCHEMA IF NOT EXISTS test_data;

-- Create test users table
CREATE TABLE IF NOT EXISTS test_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create test agencies table
CREATE TABLE IF NOT EXISTS test_agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create test ingredients table
CREATE TABLE IF NOT EXISTS test_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES test_agencies(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    cost_per_unit DECIMAL(10,2),
    supplier VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create test recipes table
CREATE TABLE IF NOT EXISTS test_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES test_agencies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    servings INTEGER DEFAULT 1,
    ingredients JSONB DEFAULT '[]',
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create test menu items table
CREATE TABLE IF NOT EXISTS test_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES test_agencies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2),
    recipe_id UUID REFERENCES test_recipes(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO test_agencies (name, slug) VALUES 
    ('Test Agency', 'test-agency'),
    ('Demo Restaurant', 'demo-restaurant')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO test_users (email, password_hash, name, role) VALUES 
    ('test@gastropartner.se', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKzTy4YBZpL4c5.', 'Test User', 'admin'),
    ('demo@gastropartner.se', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKzTy4YBZpL4c5.', 'Demo User', 'user')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_ingredients_agency_id ON test_ingredients(agency_id);
CREATE INDEX IF NOT EXISTS idx_test_recipes_agency_id ON test_recipes(agency_id);
CREATE INDEX IF NOT EXISTS idx_test_menu_items_agency_id ON test_menu_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_test_menu_items_recipe_id ON test_menu_items(recipe_id);

-- Grant permissions to test user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;

-- Create test schema permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA test_data TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA test_data TO test_user;

-- Log initialization completion
SELECT 'Test database initialized successfully' AS status;