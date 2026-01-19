/*
  # Update RLS policies for multi-tenancy

  1. Changes
    - Drop existing RLS policies
    - Create new policies that filter by project_id
    - Ensure users can only access data from projects they have access to

  2. Security
    - All queries must filter by project_id
    - Users must have access to the project via user_project_access table
*/

-- Helper function to check if user has access to project
CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_project_access 
    WHERE user_id = auth.uid() 
    AND project_id = project_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suppliers policies
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON suppliers;

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

-- Orders policies
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

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

-- Returns policies
DROP POLICY IF EXISTS "Authenticated users can view returns" ON returns;
DROP POLICY IF EXISTS "Authenticated users can insert returns" ON returns;
DROP POLICY IF EXISTS "Authenticated users can update returns" ON returns;
DROP POLICY IF EXISTS "Authenticated users can delete returns" ON returns;

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

-- Active receipts policies
DROP POLICY IF EXISTS "Authenticated users can view active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Authenticated users can insert active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Authenticated users can update active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Authenticated users can delete active_receipts" ON active_receipts;

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

-- Transactions policies
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can update transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON transactions;

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

-- Card transactions policies
DROP POLICY IF EXISTS "Authenticated users can view card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Authenticated users can update card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete card_transactions" ON card_transactions;

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

-- Tariff settings policies
DROP POLICY IF EXISTS "Authenticated users can view tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Authenticated users can insert tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Authenticated users can update tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Authenticated users can delete tariff_settings" ON tariff_settings;

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

-- Audit logs policies (optional project_id, so different logic)
DROP POLICY IF EXISTS "Authenticated users can view audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON audit_logs;

CREATE POLICY "Users can view audit logs in their projects"
  ON audit_logs FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert audit logs in their projects"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

-- Receipt field changes policies
DROP POLICY IF EXISTS "Authenticated users can view receipt field changes" ON receipt_field_changes;
DROP POLICY IF EXISTS "Authenticated users can insert receipt field changes" ON receipt_field_changes;

CREATE POLICY "Users can view receipt changes in their projects"
  ON receipt_field_changes FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert receipt changes in their projects"
  ON receipt_field_changes FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

-- Accepted orders policies  
DROP POLICY IF EXISTS "Authenticated users can view accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Authenticated users can insert accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Authenticated users can update accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Authenticated users can delete accepted_orders" ON accepted_orders;

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

-- Order photos policies
DROP POLICY IF EXISTS "Authenticated users can view order_photos" ON order_photos;
DROP POLICY IF EXISTS "Authenticated users can insert order_photos" ON order_photos;
DROP POLICY IF EXISTS "Authenticated users can delete order_photos" ON order_photos;

CREATE POLICY "Users can view order photos in their projects"
  ON order_photos FOR SELECT TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can insert order photos in their projects"
  ON order_photos FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR user_has_project_access(project_id));

CREATE POLICY "Users can delete order photos in their projects"
  ON order_photos FOR DELETE TO authenticated
  USING (project_id IS NULL OR user_has_project_access(project_id));