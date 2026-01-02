/*
  # Update user profile trigger for invite system

  ## Changes
  
  1. Updates the trigger function to:
    - Set invited_by from user metadata
    - Set default status as 'pending'
    - Set is_admin to false by default
    - Preserve existing role logic
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active, status, is_admin, invited_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer',
    true,
    'pending',
    false,
    (NEW.raw_user_meta_data->>'invited_by')::uuid
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();