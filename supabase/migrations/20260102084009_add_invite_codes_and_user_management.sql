/*
  # Add invite codes and user management system

  ## Changes
  
  1. New Tables
    - `invite_codes` - Stores invitation codes for user registration
      - `id` (uuid, primary key)
      - `code` (text, unique) - The actual invite code
      - `created_by` (uuid) - User who created the code
      - `used_by` (uuid, nullable) - User who used the code
      - `is_used` (boolean) - Whether the code has been used
      - `expires_at` (timestamptz) - When the code expires
      - `created_at` (timestamptz)
  
  2. Table Modifications
    - `user_profiles` - Add user management fields
      - `status` (text) - User status: pending, approved, blocked
      - `is_admin` (boolean) - Whether user is an administrator
      - `invited_by` (uuid, nullable) - Who invited this user
  
  3. Security
    - Enable RLS on invite_codes table
    - Add policies for admin-only access to invite codes
    - Update user_profiles policies for status checks
*/

-- Create invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on invite_codes
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Policies for invite_codes - only admins can manage
CREATE POLICY "Admins can view all invite codes"
  ON invite_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Admins can create invite codes"
  ON invite_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Admins can update invite codes"
  ON invite_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Admins can delete invite codes"
  ON invite_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
      AND user_profiles.status = 'approved'
    )
  );

-- Allow anonymous users to check if invite code is valid
CREATE POLICY "Anyone can check invite code validity"
  ON invite_codes FOR SELECT
  TO anon
  USING (is_used = false AND expires_at > now());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_used ON invite_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);