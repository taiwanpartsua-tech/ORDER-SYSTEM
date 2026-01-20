/*
  # Fix RLS policies for receipt_orders table

  1. Changes
    - Add INSERT policy for authenticated users to create receipt_orders
    - Add UPDATE policy for authenticated users to modify receipt_orders
    - Add DELETE policy for authenticated users to remove receipt_orders
    - Add SELECT policy for authenticated users to view receipt_orders

  2. Security
    - All policies check that user is authenticated
    - Users can only access receipt_orders for their project
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Supplier can view receipt orders" ON receipt_orders;

-- Allow authenticated users to view receipt_orders in their project
CREATE POLICY "Users can view receipt orders in their project"
  ON receipt_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_receipts
      WHERE active_receipts.id = receipt_orders.receipt_id
      AND EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = active_receipts.project_id
      )
    )
  );

-- Allow authenticated users to insert receipt_orders in their project
CREATE POLICY "Users can insert receipt orders in their project"
  ON receipt_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM active_receipts
      WHERE active_receipts.id = receipt_orders.receipt_id
      AND EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = active_receipts.project_id
      )
    )
  );

-- Allow authenticated users to update receipt_orders in their project
CREATE POLICY "Users can update receipt orders in their project"
  ON receipt_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_receipts
      WHERE active_receipts.id = receipt_orders.receipt_id
      AND EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = active_receipts.project_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM active_receipts
      WHERE active_receipts.id = receipt_orders.receipt_id
      AND EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = active_receipts.project_id
      )
    )
  );

-- Allow authenticated users to delete receipt_orders in their project
CREATE POLICY "Users can delete receipt orders in their project"
  ON receipt_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_receipts
      WHERE active_receipts.id = receipt_orders.receipt_id
      AND EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = active_receipts.project_id
      )
    )
  );

-- Also add supplier-specific view policy
CREATE POLICY "Suppliers can view their receipt orders"
  ON receipt_orders
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'role') = 'supplier'
    AND EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON suppliers.id = orders.supplier_id
      WHERE orders.id = receipt_orders.order_id
      AND suppliers.name = (SELECT auth.jwt() ->> 'email')
    )
  );
