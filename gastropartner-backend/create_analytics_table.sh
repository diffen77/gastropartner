#!/bin/bash
# Script to create the missing user_analytics_events table

echo "Creating user_analytics_events table..."

# The SQL to create the analytics table
SQL="
CREATE TABLE IF NOT EXISTS public.user_analytics_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID NULL,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    page_url VARCHAR(500) NULL,
    element_id VARCHAR(100) NULL,
    element_text VARCHAR(255) NULL,
    session_id VARCHAR(255) NULL,
    user_agent VARCHAR(500) NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_organization_id ON public.user_analytics_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_user_id ON public.user_analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_event_type ON public.user_analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_event_name ON public.user_analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_created_at ON public.user_analytics_events (created_at);
"

echo "SQL to execute:"
echo "$SQL"
echo ""
echo "Please run this SQL in your Supabase dashboard SQL editor or via psql:"
echo "1. Go to https://supabase.com/dashboard/project/gamkayswexhlshuepnei/sql/new"
echo "2. Copy and paste the SQL above"
echo "3. Click 'Run'"
echo ""
echo "Or if you have psql access to the database, you can pipe this SQL to psql."