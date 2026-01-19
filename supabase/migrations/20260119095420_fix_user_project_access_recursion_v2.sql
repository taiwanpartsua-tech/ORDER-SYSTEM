/*
  # Fix user_project_access recursion issue

  1. Problem
    - The user_has_project_access function queries user_project_access table
    - RLS policies on user_project_access table can trigger recursion
    - Causes "infinite recursion detected in policy" error

  2. Solution
    - Make user_has_project_access function bypass RLS completely
    - Simplify policies on user_project_access to avoid recursion
    - Use direct auth.uid() checks instead of nested queries

  3. Security
    - Function uses SECURITY DEFINER to bypass RLS safely
    - Policies still enforce proper access control
    - Super admins can see everything
    - Users can only see their own access records
*/

-- Drop and recreate the function with proper RLS bypass
DROP FUNCTION IF EXISTS user_has_project_access(uuid) CASCADE;

CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
  user_role text;
BEGIN
  -- Check if user is super_admin (they have access to all projects)
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Direct query without RLS (function is SECURITY DEFINER)
  -- This bypasses RLS policies on user_project_access table
  SELECT EXISTS (
    SELECT 1 
    FROM user_project_access 
    WHERE user_id = auth.uid() 
    AND project_id = project_uuid
  ) INTO has_access;
  
  RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION user_has_project_access(uuid) TO authenticated;

-- Drop problematic policies on user_project_access
DROP POLICY IF EXISTS "Users can view their own project access" ON user_project_access;
DROP POLICY IF EXISTS "Project admins can view all access in their projects" ON user_project_access;
DROP POLICY IF EXISTS "Super admins and project admins can grant access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins and project admins can revoke access" ON user_project_access;
DROP POLICY IF EXISTS "Users can view their own access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins can view all access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins can grant access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins can update access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins can revoke access" ON user_project_access;

-- Recreate simple, non-recursive policies for user_project_access

-- Users can view their own access records
CREATE POLICY "Users can view their own access"
  ON user_project_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admins can view all access records
CREATE POLICY "Super admins can view all access"
  ON user_project_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Super admins can grant access
CREATE POLICY "Super admins can grant access"
  ON user_project_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Super admins can update access
CREATE POLICY "Super admins can update access"
  ON user_project_access
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Super admins can revoke access
CREATE POLICY "Super admins can revoke access"
  ON user_project_access
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Recreate all dependent policies (they were dropped with CASCADE)

-- Suppliers
CREATE POLICY "Users can view suppliers in their projects"
  ON suppliers FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert suppliers in their projects"
  ON suppliers FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update suppliers in their projects"
  ON suppliers FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete suppliers in their projects"
  ON suppliers FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Orders
CREATE POLICY "Users can view orders in their projects"
  ON orders FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert orders in their projects"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update orders in their projects"
  ON orders FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete orders in their projects"
  ON orders FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Returns
CREATE POLICY "Users can view returns in their projects"
  ON returns FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert returns in their projects"
  ON returns FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update returns in their projects"
  ON returns FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete returns in their projects"
  ON returns FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Active receipts
CREATE POLICY "Users can view receipts in their projects"
  ON active_receipts FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert receipts in their projects"
  ON active_receipts FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update receipts in their projects"
  ON active_receipts FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete receipts in their projects"
  ON active_receipts FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Transactions
CREATE POLICY "Users can view transactions in their projects"
  ON transactions FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert transactions in their projects"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update transactions in their projects"
  ON transactions FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete transactions in their projects"
  ON transactions FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Card transactions
CREATE POLICY "Users can view card transactions in their projects"
  ON card_transactions FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert card transactions in their projects"
  ON card_transactions FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update card transactions in their projects"
  ON card_transactions FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete card transactions in their projects"
  ON card_transactions FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Tariff settings
CREATE POLICY "Users can view tariff settings in their projects"
  ON tariff_settings FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert tariff settings in their projects"
  ON tariff_settings FOR INSERT TO authenticated
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update tariff settings in their projects"
  ON tariff_settings FOR UPDATE TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete tariff settings in their projects"
  ON tariff_settings FOR DELETE TO authenticated
  USING (user_has_project_access(project_id));

-- Audit logs
CREATE POLICY "Users can view audit logs in their projects"
  ON audit_logs FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert audit logs in their projects"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

-- Receipt field changes
CREATE POLICY "Users can view receipt changes in their projects"
  ON receipt_field_changes FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert receipt changes in their projects"
  ON receipt_field_changes FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

-- Accepted orders
CREATE POLICY "Users can view accepted orders in their projects"
  ON accepted_orders FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert accepted orders in their projects"
  ON accepted_orders FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can update accepted orders in their projects"
  ON accepted_orders FOR UPDATE TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id))
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can delete accepted orders in their projects"
  ON accepted_orders FOR DELETE TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

-- Order photos
CREATE POLICY "Users can view order photos in their projects"
  ON order_photos FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert order photos in their projects"
  ON order_photos FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can delete order photos in their projects"
  ON order_photos FOR DELETE TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));