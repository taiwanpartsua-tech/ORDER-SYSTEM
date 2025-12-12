/*
  # Fix RLS Policies for Anonymous Access

  1. Changes
    - Update all RLS policies to allow anonymous (anon) access instead of only authenticated users
    - This allows the application to work without requiring user authentication

  2. Security
    - Policies now apply to both authenticated and anonymous users
    - All operations (SELECT, INSERT, UPDATE, DELETE) are allowed for all tables
*/

-- Drop existing policies and recreate with anon access

-- Orders table policies
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
  ON orders FOR DELETE
  TO anon, authenticated
  USING (true);

-- Suppliers table policies
DROP POLICY IF EXISTS "Users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers" ON suppliers;

CREATE POLICY "Anyone can view suppliers"
  ON suppliers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert suppliers"
  ON suppliers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update suppliers"
  ON suppliers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete suppliers"
  ON suppliers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Active receipts table policies
DROP POLICY IF EXISTS "Users can view active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Users can insert active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Users can update active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Users can delete active receipts" ON active_receipts;

CREATE POLICY "Anyone can view active receipts"
  ON active_receipts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert active receipts"
  ON active_receipts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update active receipts"
  ON active_receipts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete active receipts"
  ON active_receipts FOR DELETE
  TO anon, authenticated
  USING (true);

-- Receipt items table policies
DROP POLICY IF EXISTS "Users can view receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Users can insert receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Users can update receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Users can delete receipt items" ON receipt_items;

CREATE POLICY "Anyone can view receipt items"
  ON receipt_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert receipt items"
  ON receipt_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update receipt items"
  ON receipt_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete receipt items"
  ON receipt_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- Supplier transactions table policies
DROP POLICY IF EXISTS "Users can view supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Users can insert supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Users can update supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Users can delete supplier transactions" ON supplier_transactions;

CREATE POLICY "Anyone can view supplier transactions"
  ON supplier_transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert supplier transactions"
  ON supplier_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update supplier transactions"
  ON supplier_transactions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete supplier transactions"
  ON supplier_transactions FOR DELETE
  TO anon, authenticated
  USING (true);
