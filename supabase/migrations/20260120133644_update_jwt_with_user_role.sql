/*
  # Update JWT with User Role

  This migration ensures that the user's role is stored in their JWT token
  so that RLS policies can access it without causing recursion on user_profiles table.
  
  1. Updates handle_new_user to set role in JWT app_metadata
  2. Creates trigger to update JWT when user profile role changes
*/

-- Update handle_new_user to set role in JWT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  
  -- Update JWT with role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'customer')
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update JWT when user profile role changes
CREATE OR REPLACE FUNCTION update_user_jwt_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if role has changed
  IF (TG_OP = 'INSERT') OR (OLD.role IS DISTINCT FROM NEW.role) THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update JWT when profile role changes
DROP TRIGGER IF EXISTS update_jwt_on_profile_change ON user_profiles;
CREATE TRIGGER update_jwt_on_profile_change
  AFTER INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_jwt_on_role_change();

-- Update existing users' JWTs with their roles
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, role FROM user_profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;