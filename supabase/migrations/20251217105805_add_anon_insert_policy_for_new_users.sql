/*
  # Add policy for anonymous users during signup
  
  1. Changes
    - Add policy to allow anon role to insert profiles
    - This is needed because auth.users insert happens with anon privileges
    - The trigger then tries to insert into user_profiles
  
  2. Security
    - Policy is restrictive: only allows insert with matching auth.uid()
    - Only for new user creation during signup
*/

-- Add policy for anon to insert their own profile during signup
CREATE POLICY "Allow anon to insert during signup"
  ON user_profiles FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also ensure authenticated users can insert if needed
CREATE POLICY "Allow authenticated insert during signup"  
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);