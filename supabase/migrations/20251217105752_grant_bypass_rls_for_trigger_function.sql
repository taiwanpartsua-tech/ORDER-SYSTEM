/*
  # Grant RLS bypass for trigger function
  
  1. Changes
    - Recreate handle_new_user function to explicitly bypass RLS
    - Use SET statement to ensure proper permissions
    - Add error handling
  
  2. Security
    - Function runs with elevated privileges only for user creation
    - Still maintains security through trigger context
*/

-- Drop and recreate function with explicit RLS bypass
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function with explicit permissions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Explicitly insert into user_profiles
  -- SECURITY DEFINER means this runs with creator's privileges (postgres)
  -- which should bypass RLS
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer',
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres, authenticated, anon, service_role;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();