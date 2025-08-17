-- Migration: Create feature flags table
-- This table stores feature flag settings for tenants

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    flags_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id TEXT NOT NULL REFERENCES public.agencies(agency_id) ON DELETE CASCADE,
    show_recipe_prep_time BOOLEAN NOT NULL DEFAULT FALSE,
    show_recipe_cook_time BOOLEAN NOT NULL DEFAULT FALSE,
    show_recipe_instructions BOOLEAN NOT NULL DEFAULT FALSE,
    show_recipe_notes BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one feature flags record per agency
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_agency_id_unique ON public.feature_flags(agency_id);

-- Enable Row Level Security
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for feature flags
CREATE POLICY "Users can only access their agency's feature flags" ON public.feature_flags
    USING (agency_id = current_setting('gastropartner.current_agency_id', true));

-- Create policy for authenticated users to insert feature flags
CREATE POLICY "Users can insert feature flags for their agency" ON public.feature_flags
    FOR INSERT
    WITH CHECK (agency_id = current_setting('gastropartner.current_agency_id', true));

-- Create policy for authenticated users to update feature flags
CREATE POLICY "Users can update their agency's feature flags" ON public.feature_flags
    FOR UPDATE
    USING (agency_id = current_setting('gastropartner.current_agency_id', true))
    WITH CHECK (agency_id = current_setting('gastropartner.current_agency_id', true));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_flags_updated_at();

-- Insert default feature flags for existing agencies
INSERT INTO public.feature_flags (agency_id, show_recipe_prep_time, show_recipe_cook_time, show_recipe_instructions, show_recipe_notes)
SELECT agency_id, FALSE, FALSE, FALSE, FALSE
FROM public.agencies
WHERE agency_id NOT IN (SELECT agency_id FROM public.feature_flags);