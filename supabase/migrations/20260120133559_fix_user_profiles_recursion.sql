/*
  # Fix User Profiles Recursion Issue

  The problem: RLS policies on user_profiles table were querying user_profiles
  to check user roles, causing infinite recursion.
  
  Solution: Use auth.jwt() to get user role from JWT token instead of querying
  user_profiles table. The role is stored in JWT during user creation/login.
*/

-- Drop all existing user_profiles policies that cause recursion
DROP POLICY IF EXISTS "Super admin can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile basic info" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Recreate policies using auth.jwt() to avoid recursion
CREATE POLICY "Super admin can insert profiles"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "Super admin can update profiles"
  ON user_profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "Super admin can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "Users can update own profile basic info"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Now fix all other policies that check user roles by querying user_profiles
-- We'll update them to use auth.jwt() instead

-- Suppliers policies
DROP POLICY IF EXISTS "Supplier can view supplier balances" ON suppliers;
CREATE POLICY "Supplier can view supplier balances"
  ON suppliers FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND name = (SELECT auth.jwt()->>'email')
  );

-- Orders policies
DROP POLICY IF EXISTS "Supplier can view all orders" ON orders;
CREATE POLICY "Supplier can view all orders"
  ON orders FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'supplier');

DROP POLICY IF EXISTS "Supplier can update orders" ON orders;
CREATE POLICY "Supplier can update orders"
  ON orders FOR UPDATE TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = orders.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = orders.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Receipt orders policies
DROP POLICY IF EXISTS "Supplier can view receipt orders" ON receipt_orders;
CREATE POLICY "Supplier can view receipt orders"
  ON receipt_orders FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON suppliers.id = orders.supplier_id
      WHERE orders.id = receipt_orders.order_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Transactions policies
DROP POLICY IF EXISTS "Supplier can view transactions" ON transactions;
CREATE POLICY "Supplier can view transactions"
  ON transactions FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM active_receipts
      JOIN suppliers ON suppliers.id = active_receipts.supplier_id
      WHERE active_receipts.id = transactions.receipt_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Card transactions policies
DROP POLICY IF EXISTS "Supplier can view card transactions" ON card_transactions;
CREATE POLICY "Supplier can view card transactions"
  ON card_transactions FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND (
      EXISTS (
        SELECT 1 FROM active_receipts
        JOIN suppliers ON suppliers.id = active_receipts.supplier_id
        WHERE active_receipts.id = card_transactions.receipt_id
        AND suppliers.name = (SELECT auth.jwt()->>'email')
      )
      OR EXISTS (
        SELECT 1 FROM orders
        JOIN suppliers ON suppliers.id = orders.supplier_id
        WHERE orders.id = card_transactions.order_id
        AND suppliers.name = (SELECT auth.jwt()->>'email')
      )
    )
  );

-- Returns policies
DROP POLICY IF EXISTS "Supplier can view returns" ON returns;
CREATE POLICY "Supplier can view returns"
  ON returns FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = returns.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Active receipts policies
DROP POLICY IF EXISTS "Supplier can view receipts" ON active_receipts;
CREATE POLICY "Supplier can view receipts"
  ON active_receipts FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = active_receipts.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Receipt order snapshots policies
DROP POLICY IF EXISTS "Supplier can view receipt order snapshots" ON receipt_order_snapshots;
CREATE POLICY "Supplier can view receipt order snapshots"
  ON receipt_order_snapshots FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON suppliers.id = orders.supplier_id
      WHERE orders.id = receipt_order_snapshots.order_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Accepted orders policies
DROP POLICY IF EXISTS "Supplier can view accepted orders" ON accepted_orders;
CREATE POLICY "Supplier can view accepted orders"
  ON accepted_orders FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = accepted_orders.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Audit logs policies
DROP POLICY IF EXISTS "Super admin can view all logs" ON audit_logs;
CREATE POLICY "Super admin can view all logs"
  ON audit_logs FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

-- Invite codes policies
DROP POLICY IF EXISTS "Admins can create invite codes" ON invite_codes;
CREATE POLICY "Admins can create invite codes"
  ON invite_codes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "Admins can delete invite codes" ON invite_codes;
CREATE POLICY "Admins can delete invite codes"
  ON invite_codes FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "Admins can update invite codes" ON invite_codes;
CREATE POLICY "Admins can update invite codes"
  ON invite_codes FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'))
  WITH CHECK ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "Admins can view all invite codes" ON invite_codes;
CREATE POLICY "Admins can view all invite codes"
  ON invite_codes FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'));

-- Archived audit logs policies
DROP POLICY IF EXISTS "Super admin can view all archived logs" ON archived_audit_logs;
CREATE POLICY "Super admin can view all archived logs"
  ON archived_audit_logs FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "System can delete old archived logs" ON archived_audit_logs;
CREATE POLICY "System can delete old archived logs"
  ON archived_audit_logs FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

-- Order photos policies
DROP POLICY IF EXISTS "Supplier can manage order photos" ON order_photos;
CREATE POLICY "Supplier can manage order photos"
  ON order_photos FOR ALL TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON suppliers.id = orders.supplier_id
      WHERE orders.id = order_photos.order_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON suppliers.id = orders.supplier_id
      WHERE orders.id = order_photos.order_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Receipt field changes policies
DROP POLICY IF EXISTS "Supplier can view receipt field changes" ON receipt_field_changes;
CREATE POLICY "Supplier can view receipt field changes"
  ON receipt_field_changes FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM active_receipts
      JOIN suppliers ON suppliers.id = active_receipts.supplier_id
      WHERE active_receipts.id = receipt_field_changes.receipt_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

-- Projects policies
DROP POLICY IF EXISTS "Super admins can create projects" ON projects;
CREATE POLICY "Super admins can create projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins can delete projects" ON projects;
CREATE POLICY "Super admins can delete projects"
  ON projects FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins can update projects" ON projects;
CREATE POLICY "Super admins can update projects"
  ON projects FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
CREATE POLICY "Users can view projects they have access to"
  ON projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.user_id = (SELECT auth.uid())
      AND user_project_access.project_id = projects.id
    )
    OR (SELECT auth.jwt()->>'role') = 'super_admin'
  );

-- User project access policies
DROP POLICY IF EXISTS "Super admins can grant access" ON user_project_access;
CREATE POLICY "Super admins can grant access"
  ON user_project_access FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins can revoke access" ON user_project_access;
CREATE POLICY "Super admins can revoke access"
  ON user_project_access FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins can update access" ON user_project_access;
CREATE POLICY "Super admins can update access"
  ON user_project_access FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins can view all access" ON user_project_access;
CREATE POLICY "Super admins can view all access"
  ON user_project_access FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

-- Counterparties policies
DROP POLICY IF EXISTS "Admins can insert counterparties" ON counterparties;
CREATE POLICY "Admins can insert counterparties"
  ON counterparties FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "Admins can update counterparties" ON counterparties;
CREATE POLICY "Admins can update counterparties"
  ON counterparties FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'))
  WITH CHECK ((SELECT auth.jwt()->>'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "Super admins can delete counterparties" ON counterparties;
CREATE POLICY "Super admins can delete counterparties"
  ON counterparties FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Users can view counterparties in their projects" ON counterparties;
CREATE POLICY "Users can view counterparties in their projects"
  ON counterparties FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.user_id = (SELECT auth.uid())
      AND user_project_access.project_id = counterparties.project_id
    )
    OR (SELECT auth.jwt()->>'role') = 'super_admin'
  );

-- Draft orders policies
DROP POLICY IF EXISTS "Non-suppliers can delete draft orders" ON draft_orders;
CREATE POLICY "Non-suppliers can delete draft orders"
  ON draft_orders FOR DELETE TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') != 'supplier'
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = (SELECT auth.uid())
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR (SELECT auth.jwt()->>'role') = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Non-suppliers can insert draft orders" ON draft_orders;
CREATE POLICY "Non-suppliers can insert draft orders"
  ON draft_orders FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') != 'supplier'
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = (SELECT auth.uid())
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR (SELECT auth.jwt()->>'role') = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Non-suppliers can update draft orders" ON draft_orders;
CREATE POLICY "Non-suppliers can update draft orders"
  ON draft_orders FOR UPDATE TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') != 'supplier'
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = (SELECT auth.uid())
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR (SELECT auth.jwt()->>'role') = 'super_admin'
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') != 'supplier'
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = (SELECT auth.uid())
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR (SELECT auth.jwt()->>'role') = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can view all draft orders" ON draft_orders;
CREATE POLICY "Super admins can view all draft orders"
  ON draft_orders FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'super_admin');

DROP POLICY IF EXISTS "Suppliers can update their draft orders" ON draft_orders;
CREATE POLICY "Suppliers can update their draft orders"
  ON draft_orders FOR UPDATE TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = draft_orders.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = draft_orders.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Suppliers can view their draft orders" ON draft_orders;
CREATE POLICY "Suppliers can view their draft orders"
  ON draft_orders FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = draft_orders.supplier_id
      AND suppliers.name = (SELECT auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Users can view draft orders in their projects" ON draft_orders;
CREATE POLICY "Users can view draft orders in their projects"
  ON draft_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.user_id = (SELECT auth.uid())
      AND user_project_access.project_id = draft_orders.project_id
    )
  );