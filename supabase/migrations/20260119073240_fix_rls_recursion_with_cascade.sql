/*
  # Fix RLS Recursion with Cascade
  
  1. Changes
    - Drop user_has_project_access function with CASCADE
    - Recreate function with proper security settings
    - Recreate all dependent RLS policies
  
  2. Security
    - Function uses SECURITY DEFINER and SET search_path for security
    - Checks super_admin role first
    - Then checks explicit project access
*/

-- Drop function with CASCADE to remove all dependent policies
DROP FUNCTION IF EXISTS user_has_project_access(uuid) CASCADE;

-- Recreate the function with proper security settings
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
  
  -- Check if user has explicit access to this project
  SELECT EXISTS (
    SELECT 1 
    FROM user_project_access 
    WHERE user_id = auth.uid() 
    AND project_id = project_uuid
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION user_has_project_access(uuid) TO authenticated;

-- Recreate all RLS policies

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
