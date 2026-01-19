/*
  # Allow super admins to view all projects

  1. Changes
    - Update projects SELECT policy to allow super admins to view all projects
    - Regular users can only see projects they have explicit access to

  2. Security
    - Maintains existing security for regular users
    - Only users with role = 'super_admin' can see all projects
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;

-- Create updated policy that allows super admins to view all projects
CREATE POLICY "Users can view projects they have access to"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all projects
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
    OR
    -- Regular users can only see projects they have access to
    id IN (
      SELECT project_id 
      FROM user_project_access 
      WHERE user_id = auth.uid()
    )
  );