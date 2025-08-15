-- Migration: Create user_analytics_events table for tracking analytics events
-- This migration creates the missing user_analytics_events table that is referenced in the analytics service

-- Create user_analytics_events table
CREATE TABLE IF NOT EXISTS public.user_analytics_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID NULL, -- Can be null for anonymous events
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

-- Enable Row Level Security
ALTER TABLE public.user_analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow organizations to access only their own analytics events
CREATE POLICY "Organizations can access their own analytics events" ON public.user_analytics_events
    FOR ALL USING (organization_id::text = (current_setting('request.jwt.claims', true)::json ->> 'organization_id'));

-- Add table and column comments for documentation
COMMENT ON TABLE public.user_analytics_events IS 'Stores user analytics events for tracking feature usage, conversions, and user behavior';
COMMENT ON COLUMN public.user_analytics_events.event_id IS 'Unique identifier for the analytics event';
COMMENT ON COLUMN public.user_analytics_events.organization_id IS 'Organization that this event belongs to';
COMMENT ON COLUMN public.user_analytics_events.user_id IS 'User who triggered the event (null for anonymous events)';
COMMENT ON COLUMN public.user_analytics_events.event_type IS 'Type of event (feature_usage, limit_hit, upgrade_prompt, conversion)';
COMMENT ON COLUMN public.user_analytics_events.event_name IS 'Specific name of the event';
COMMENT ON COLUMN public.user_analytics_events.page_url IS 'URL where the event occurred';
COMMENT ON COLUMN public.user_analytics_events.element_id IS 'ID of DOM element that triggered the event';
COMMENT ON COLUMN public.user_analytics_events.element_text IS 'Text content of the element that triggered the event';
COMMENT ON COLUMN public.user_analytics_events.session_id IS 'Session identifier for tracking user sessions';
COMMENT ON COLUMN public.user_analytics_events.user_agent IS 'User agent string from the browser';
COMMENT ON COLUMN public.user_analytics_events.properties IS 'Additional event properties stored as JSON';
COMMENT ON COLUMN public.user_analytics_events.created_at IS 'Timestamp when the event was created';