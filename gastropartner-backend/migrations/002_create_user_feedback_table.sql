-- Create user_feedback table for user testing functionality
CREATE TABLE IF NOT EXISTS public.user_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'general', 'usability', 'satisfaction')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    current_page VARCHAR(255),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    resolution TEXT,
    assigned_to UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_organization_id ON public.user_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see feedback from their organization
CREATE POLICY "Users can view feedback from their organization" ON public.user_feedback
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can create feedback for their organization
CREATE POLICY "Users can create feedback for their organization" ON public.user_feedback
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Policy: Users can update feedback from their organization (for status changes)
CREATE POLICY "Users can update feedback from their organization" ON public.user_feedback
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON public.user_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data
INSERT INTO public.user_feedback (
    user_id, 
    organization_id, 
    feedback_type, 
    title, 
    description, 
    current_page,
    status
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'usability',
    'Förbättra navigation',
    'Navigationen mellan sidor kunde vara tydligare. Särskilt från ingredienser till recept.',
    '/ingredienser',
    'open'
),
(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'feature_request',
    'Lägg till bulk-import för ingredienser',
    'Det skulle vara bra att kunna importera många ingredienser samtidigt via CSV eller Excel.',
    '/ingredienser',
    'open'
),
(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'satisfaction',
    'Mycket nöjd med UI Text Analyzer',
    'Den nya UI Text Analyzer-funktionen är fantastisk! Mycket användbar för att förstå användarupplevelsen.',
    '/user-testing',
    'resolved'
);