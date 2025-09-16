-- Create user analytics events table for tracking feature usage and conversions
CREATE TABLE IF NOT EXISTS public.user_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    page_url TEXT,
    session_id VARCHAR(100),
    user_agent TEXT,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policy for multi-tenant security
ALTER TABLE public.user_analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy for organizations to only see their own analytics
CREATE POLICY "Organizations can only view their own analytics" ON public.user_analytics_events
    FOR ALL USING (
        organization_id = (current_setting('app.current_organization_id', true))::UUID
    );

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_organization_id ON public.user_analytics_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.user_analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.user_analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_org_event_time ON public.user_analytics_events (organization_id, event_type, created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON public.user_analytics_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();