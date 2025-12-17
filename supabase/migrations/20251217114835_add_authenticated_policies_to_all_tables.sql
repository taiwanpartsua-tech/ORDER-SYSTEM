/*
  # Додати політики для authenticated користувачів

  1. Проблема
    - Політики RLS налаштовані лише для anon ролі
    - Після логіну користувач має роль authenticated
    - Authenticated користувачі не можуть читати/писати дані

  2. Рішення
    - Додати політики для authenticated ролі для всіх таблиць
    - Надати повний доступ (читання, вставка, оновлення, видалення)

  3. Таблиці
    - orders, suppliers, returns, active_receipts, receipt_orders
    - transactions, card_transactions, accepted_orders, tariff_settings
    - user_profiles, audit_logs, receipts, mutual_settlements, managers
    - receipt_order_snapshots
*/

-- Orders
DROP POLICY IF EXISTS "Allow authenticated read access to orders" ON orders;
CREATE POLICY "Allow authenticated read access to orders"
  ON orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to orders" ON orders;
CREATE POLICY "Allow authenticated insert to orders"
  ON orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to orders" ON orders;
CREATE POLICY "Allow authenticated update to orders"
  ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from orders" ON orders;
CREATE POLICY "Allow authenticated delete from orders"
  ON orders FOR DELETE TO authenticated USING (true);

-- Suppliers
DROP POLICY IF EXISTS "Allow authenticated read access to suppliers" ON suppliers;
CREATE POLICY "Allow authenticated read access to suppliers"
  ON suppliers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to suppliers" ON suppliers;
CREATE POLICY "Allow authenticated insert to suppliers"
  ON suppliers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to suppliers" ON suppliers;
CREATE POLICY "Allow authenticated update to suppliers"
  ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from suppliers" ON suppliers;
CREATE POLICY "Allow authenticated delete from suppliers"
  ON suppliers FOR DELETE TO authenticated USING (true);

-- Returns
DROP POLICY IF EXISTS "Allow authenticated read access to returns" ON returns;
CREATE POLICY "Allow authenticated read access to returns"
  ON returns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to returns" ON returns;
CREATE POLICY "Allow authenticated insert to returns"
  ON returns FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to returns" ON returns;
CREATE POLICY "Allow authenticated update to returns"
  ON returns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from returns" ON returns;
CREATE POLICY "Allow authenticated delete from returns"
  ON returns FOR DELETE TO authenticated USING (true);

-- Active Receipts
DROP POLICY IF EXISTS "Allow authenticated read access to active_receipts" ON active_receipts;
CREATE POLICY "Allow authenticated read access to active_receipts"
  ON active_receipts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to active_receipts" ON active_receipts;
CREATE POLICY "Allow authenticated insert to active_receipts"
  ON active_receipts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to active_receipts" ON active_receipts;
CREATE POLICY "Allow authenticated update to active_receipts"
  ON active_receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from active_receipts" ON active_receipts;
CREATE POLICY "Allow authenticated delete from active_receipts"
  ON active_receipts FOR DELETE TO authenticated USING (true);

-- Receipt Orders
DROP POLICY IF EXISTS "Allow authenticated read access to receipt_orders" ON receipt_orders;
CREATE POLICY "Allow authenticated read access to receipt_orders"
  ON receipt_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to receipt_orders" ON receipt_orders;
CREATE POLICY "Allow authenticated insert to receipt_orders"
  ON receipt_orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to receipt_orders" ON receipt_orders;
CREATE POLICY "Allow authenticated update to receipt_orders"
  ON receipt_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from receipt_orders" ON receipt_orders;
CREATE POLICY "Allow authenticated delete from receipt_orders"
  ON receipt_orders FOR DELETE TO authenticated USING (true);

-- Transactions
DROP POLICY IF EXISTS "Allow authenticated read access to transactions" ON transactions;
CREATE POLICY "Allow authenticated read access to transactions"
  ON transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to transactions" ON transactions;
CREATE POLICY "Allow authenticated insert to transactions"
  ON transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to transactions" ON transactions;
CREATE POLICY "Allow authenticated update to transactions"
  ON transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from transactions" ON transactions;
CREATE POLICY "Allow authenticated delete from transactions"
  ON transactions FOR DELETE TO authenticated USING (true);

-- Card Transactions
DROP POLICY IF EXISTS "Allow authenticated read access to card_transactions" ON card_transactions;
CREATE POLICY "Allow authenticated read access to card_transactions"
  ON card_transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to card_transactions" ON card_transactions;
CREATE POLICY "Allow authenticated insert to card_transactions"
  ON card_transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to card_transactions" ON card_transactions;
CREATE POLICY "Allow authenticated update to card_transactions"
  ON card_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from card_transactions" ON card_transactions;
CREATE POLICY "Allow authenticated delete from card_transactions"
  ON card_transactions FOR DELETE TO authenticated USING (true);

-- Accepted Orders
DROP POLICY IF EXISTS "Allow authenticated read access to accepted_orders" ON accepted_orders;
CREATE POLICY "Allow authenticated read access to accepted_orders"
  ON accepted_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to accepted_orders" ON accepted_orders;
CREATE POLICY "Allow authenticated insert to accepted_orders"
  ON accepted_orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to accepted_orders" ON accepted_orders;
CREATE POLICY "Allow authenticated update to accepted_orders"
  ON accepted_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from accepted_orders" ON accepted_orders;
CREATE POLICY "Allow authenticated delete from accepted_orders"
  ON accepted_orders FOR DELETE TO authenticated USING (true);

-- Tariff Settings
DROP POLICY IF EXISTS "Allow authenticated read access to tariff_settings" ON tariff_settings;
CREATE POLICY "Allow authenticated read access to tariff_settings"
  ON tariff_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to tariff_settings" ON tariff_settings;
CREATE POLICY "Allow authenticated insert to tariff_settings"
  ON tariff_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to tariff_settings" ON tariff_settings;
CREATE POLICY "Allow authenticated update to tariff_settings"
  ON tariff_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from tariff_settings" ON tariff_settings;
CREATE POLICY "Allow authenticated delete from tariff_settings"
  ON tariff_settings FOR DELETE TO authenticated USING (true);

-- User Profiles
DROP POLICY IF EXISTS "Allow authenticated read access to user_profiles" ON user_profiles;
CREATE POLICY "Allow authenticated read access to user_profiles"
  ON user_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to user_profiles" ON user_profiles;
CREATE POLICY "Allow authenticated insert to user_profiles"
  ON user_profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to user_profiles" ON user_profiles;
CREATE POLICY "Allow authenticated update to user_profiles"
  ON user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from user_profiles" ON user_profiles;
CREATE POLICY "Allow authenticated delete from user_profiles"
  ON user_profiles FOR DELETE TO authenticated USING (true);

-- Audit Logs
DROP POLICY IF EXISTS "Allow authenticated read access to audit_logs" ON audit_logs;
CREATE POLICY "Allow authenticated read access to audit_logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to audit_logs" ON audit_logs;
CREATE POLICY "Allow authenticated insert to audit_logs"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to audit_logs" ON audit_logs;
CREATE POLICY "Allow authenticated update to audit_logs"
  ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from audit_logs" ON audit_logs;
CREATE POLICY "Allow authenticated delete from audit_logs"
  ON audit_logs FOR DELETE TO authenticated USING (true);

-- Receipts
DROP POLICY IF EXISTS "Allow authenticated read access to receipts" ON receipts;
CREATE POLICY "Allow authenticated read access to receipts"
  ON receipts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to receipts" ON receipts;
CREATE POLICY "Allow authenticated insert to receipts"
  ON receipts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to receipts" ON receipts;
CREATE POLICY "Allow authenticated update to receipts"
  ON receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from receipts" ON receipts;
CREATE POLICY "Allow authenticated delete from receipts"
  ON receipts FOR DELETE TO authenticated USING (true);

-- Mutual Settlements
DROP POLICY IF EXISTS "Allow authenticated read access to mutual_settlements" ON mutual_settlements;
CREATE POLICY "Allow authenticated read access to mutual_settlements"
  ON mutual_settlements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to mutual_settlements" ON mutual_settlements;
CREATE POLICY "Allow authenticated insert to mutual_settlements"
  ON mutual_settlements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to mutual_settlements" ON mutual_settlements;
CREATE POLICY "Allow authenticated update to mutual_settlements"
  ON mutual_settlements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from mutual_settlements" ON mutual_settlements;
CREATE POLICY "Allow authenticated delete from mutual_settlements"
  ON mutual_settlements FOR DELETE TO authenticated USING (true);

-- Managers
DROP POLICY IF EXISTS "Allow authenticated read access to managers" ON managers;
CREATE POLICY "Allow authenticated read access to managers"
  ON managers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to managers" ON managers;
CREATE POLICY "Allow authenticated insert to managers"
  ON managers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to managers" ON managers;
CREATE POLICY "Allow authenticated update to managers"
  ON managers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from managers" ON managers;
CREATE POLICY "Allow authenticated delete from managers"
  ON managers FOR DELETE TO authenticated USING (true);

-- Receipt Order Snapshots
DROP POLICY IF EXISTS "Allow authenticated read access to receipt_order_snapshots" ON receipt_order_snapshots;
CREATE POLICY "Allow authenticated read access to receipt_order_snapshots"
  ON receipt_order_snapshots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to receipt_order_snapshots" ON receipt_order_snapshots;
CREATE POLICY "Allow authenticated insert to receipt_order_snapshots"
  ON receipt_order_snapshots FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to receipt_order_snapshots" ON receipt_order_snapshots;
CREATE POLICY "Allow authenticated update to receipt_order_snapshots"
  ON receipt_order_snapshots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from receipt_order_snapshots" ON receipt_order_snapshots;
CREATE POLICY "Allow authenticated delete from receipt_order_snapshots"
  ON receipt_order_snapshots FOR DELETE TO authenticated USING (true);
