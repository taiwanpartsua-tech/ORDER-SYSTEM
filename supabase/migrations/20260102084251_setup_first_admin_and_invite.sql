/*
  # Setup first admin user and create invite code

  ## Changes
  
  1. Updates user with email paska8882@gmail.com to be:
    - Admin (is_admin = true)
    - Approved status
    - Active
  
  2. Creates an initial invite code valid for 365 days
*/

-- Update admin user if exists
UPDATE user_profiles
SET 
  is_admin = true,
  status = 'approved',
  is_active = true
WHERE email = 'paska8882@gmail.com';

-- Create initial invite code (valid for 365 days)
INSERT INTO invite_codes (code, expires_at)
VALUES (
  'ARTTRANS2026',
  (NOW() + INTERVAL '365 days')
)
ON CONFLICT (code) DO NOTHING;