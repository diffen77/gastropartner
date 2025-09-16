-- Add full_name column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Insert testuser2 into users table so organization creation works
INSERT INTO public.users (user_id, email, full_name, name)
VALUES (
    'efb0ed2a-62d6-44bb-b2b6-6a238d86552f',
    'testuser2@gastropartner.se',
    'Test User 2',
    'Test User 2'
)
ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name;

-- Also add testuser@gastropartner.se if exists in auth
INSERT INTO public.users (user_id, email, full_name, name)
SELECT id, email, 'Test User 1', 'Test User 1'
FROM auth.users
WHERE email = 'testuser@gastropartner.se'
ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name;