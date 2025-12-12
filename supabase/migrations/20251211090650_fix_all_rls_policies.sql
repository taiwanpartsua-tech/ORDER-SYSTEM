/*
  # Виправлення всіх RLS політик для анонімного доступу
  
  ## Зміни
  - Видаляємо всі існуючі політики
  - Створюємо нові політики що дозволяють доступ для anon та authenticated ролей
  - Це забезпечує роботу застосунку без аутентифікації
  
  ## Таблиці
  - orders
  - suppliers
  - active_receipts
  - receipt_orders
  - receipt_items
  - supplier_transactions
  - settings
  - receipt_order_snapshots
*/

-- Orders policies
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;
DROP POLICY IF EXISTS "Allow public read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert to orders" ON orders;
DROP POLICY IF EXISTS "Allow public update to orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete from orders" ON orders;

CREATE POLICY "Public access to orders select"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to orders insert"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to orders update"
  ON orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to orders delete"
  ON orders FOR DELETE
  TO anon, authenticated
  USING (true);

-- Suppliers policies
DROP POLICY IF EXISTS "Anyone can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can delete suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public read access to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public insert to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public update to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public delete from suppliers" ON suppliers;

CREATE POLICY "Public access to suppliers select"
  ON suppliers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to suppliers insert"
  ON suppliers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to suppliers update"
  ON suppliers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to suppliers delete"
  ON suppliers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Active receipts policies
DROP POLICY IF EXISTS "Anyone can view active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Anyone can insert active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Anyone can update active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Anyone can delete active receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow public read access to active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow public insert to active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow public update to active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow public delete from active_receipts" ON active_receipts;

CREATE POLICY "Public access to active_receipts select"
  ON active_receipts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to active_receipts insert"
  ON active_receipts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to active_receipts update"
  ON active_receipts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to active_receipts delete"
  ON active_receipts FOR DELETE
  TO anon, authenticated
  USING (true);

-- Receipt orders policies
DROP POLICY IF EXISTS "Allow public read access to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow public insert to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow public delete from receipt_orders" ON receipt_orders;

CREATE POLICY "Public access to receipt_orders select"
  ON receipt_orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to receipt_orders insert"
  ON receipt_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_orders update"
  ON receipt_orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_orders delete"
  ON receipt_orders FOR DELETE
  TO anon, authenticated
  USING (true);

-- Receipt items policies
DROP POLICY IF EXISTS "Anyone can view receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Anyone can insert receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Anyone can update receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Anyone can delete receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Allow public read access to receipt_items" ON receipt_items;
DROP POLICY IF EXISTS "Allow public insert to receipt_items" ON receipt_items;
DROP POLICY IF EXISTS "Allow public update to receipt_items" ON receipt_items;
DROP POLICY IF EXISTS "Allow public delete from receipt_items" ON receipt_items;

CREATE POLICY "Public access to receipt_items select"
  ON receipt_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to receipt_items insert"
  ON receipt_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_items update"
  ON receipt_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_items delete"
  ON receipt_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- Supplier transactions policies
DROP POLICY IF EXISTS "Anyone can view supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Anyone can insert supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Anyone can update supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Anyone can delete supplier transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Allow public read access to supplier_transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Allow public insert to supplier_transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Allow public update to supplier_transactions" ON supplier_transactions;
DROP POLICY IF EXISTS "Allow public delete from supplier_transactions" ON supplier_transactions;

CREATE POLICY "Public access to supplier_transactions select"
  ON supplier_transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to supplier_transactions insert"
  ON supplier_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to supplier_transactions update"
  ON supplier_transactions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to supplier_transactions delete"
  ON supplier_transactions FOR DELETE
  TO anon, authenticated
  USING (true);

-- Settings policies
DROP POLICY IF EXISTS "Allow public read access to settings" ON settings;
DROP POLICY IF EXISTS "Allow public insert to settings" ON settings;
DROP POLICY IF EXISTS "Allow public update to settings" ON settings;
DROP POLICY IF EXISTS "Allow public delete from settings" ON settings;

CREATE POLICY "Public access to settings select"
  ON settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to settings insert"
  ON settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to settings update"
  ON settings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to settings delete"
  ON settings FOR DELETE
  TO anon, authenticated
  USING (true);

-- Receipt order snapshots policies (if exists)
DROP POLICY IF EXISTS "Allow public read access to receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Allow public insert to receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Allow public update to receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Allow public delete from receipt_order_snapshots" ON receipt_order_snapshots;

CREATE POLICY "Public access to receipt_order_snapshots select"
  ON receipt_order_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to receipt_order_snapshots insert"
  ON receipt_order_snapshots FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_order_snapshots update"
  ON receipt_order_snapshots FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_order_snapshots delete"
  ON receipt_order_snapshots FOR DELETE
  TO anon, authenticated
  USING (true);
