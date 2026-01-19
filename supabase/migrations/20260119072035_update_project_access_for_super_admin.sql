/*
  # Update project access for super admins

  1. Changes
    - Update user_has_project_access function to give super admins access to all projects
    - Super admins (role = 'super_admin') can access any project without explicit access record

  2. Security
    - Maintains existing security for regular users
    - Only users with role = 'super_admin' get automatic access to all projects
*/

-- Update helper function to allow super admins access to all projects
CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Super admins have access to all projects
  IF EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Regular users need explicit access
  RETURN EXISTS (
    SELECT 1 
    FROM user_project_access 
    WHERE user_id = auth.uid() 
    AND project_id = project_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;