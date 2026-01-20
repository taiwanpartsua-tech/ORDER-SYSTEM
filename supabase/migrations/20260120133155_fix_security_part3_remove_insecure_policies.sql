/*
  # Fix Security Issues - Part 3: Remove Insecure Policies

  CRITICAL SECURITY FIX
  
  Removes all "always true" RLS policies that effectively bypass Row Level Security.
  These policies allow unrestricted access to authenticated or anonymous users,
  completely defeating the purpose of RLS.
  
  After this migration, only properly scoped policies remain:
  - Project-based access control
  - Role-based access control  
  - User ownership verification
*/

-- accepted_orders: Remove bypass policies
DROP POLICY IF EXISTS "Allow authenticated delete from accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow authenticated insert to accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow authenticated read access to accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow authenticated update to accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow public delete from accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow public insert to accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow public read access to accepted_orders" ON accepted_orders;
DROP POLICY IF EXISTS "Allow public update to accepted_orders" ON accepted_orders;

-- active_receipts: Remove bypass policies
DROP POLICY IF EXISTS "Allow authenticated delete from active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow authenticated insert to active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow authenticated read access to active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Allow authenticated update to active_receipts" ON active_receipts;
DROP POLICY IF EXISTS "Public access to active_receipts delete" ON active_receipts;
DROP POLICY IF EXISTS "Public access to active_receipts insert" ON active_receipts;
DROP POLICY IF EXISTS "Public access to active_receipts select" ON active_receipts;
DROP POLICY IF EXISTS "Public access to active_receipts update" ON active_receipts;

-- audit_logs: Remove bypass policies
DROP POLICY IF EXISTS "Allow authenticated delete from audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert to audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated read access to audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated update to audit_logs" ON audit_logs;

-- archived_audit_logs: Remove bypass policy
DROP POLICY IF EXISTS "System can insert archived logs" ON archived_audit_logs;

-- card_transactions: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow anonymous insert to card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow anonymous read access to card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow anonymous update to card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow authenticated delete from card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow authenticated insert to card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow authenticated read access to card_transactions" ON card_transactions;
DROP POLICY IF EXISTS "Allow authenticated update to card_transactions" ON card_transactions;

-- managers: Remove bypass policies
DROP POLICY IF EXISTS "Allow all operations on managers" ON managers;
DROP POLICY IF EXISTS "Allow authenticated delete from managers" ON managers;
DROP POLICY IF EXISTS "Allow authenticated insert to managers" ON managers;
DROP POLICY IF EXISTS "Allow authenticated read access to managers" ON managers;
DROP POLICY IF EXISTS "Allow authenticated update to managers" ON managers;

-- mutual_settlements: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow anonymous insert to mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow anonymous read access to mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow anonymous update to mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow authenticated delete from mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow authenticated insert to mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow authenticated read access to mutual_settlements" ON mutual_settlements;
DROP POLICY IF EXISTS "Allow authenticated update to mutual_settlements" ON mutual_settlements;

-- order_photos: Remove bypass policies
DROP POLICY IF EXISTS "Authenticated users can delete order photos" ON order_photos;
DROP POLICY IF EXISTS "Authenticated users can insert order photos" ON order_photos;
DROP POLICY IF EXISTS "Authenticated users can update order photos" ON order_photos;
DROP POLICY IF EXISTS "Authenticated users can view order photos" ON order_photos;

-- orders: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from orders" ON orders;
DROP POLICY IF EXISTS "Allow anonymous insert to orders" ON orders;
DROP POLICY IF EXISTS "Allow anonymous read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow anonymous update to orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated delete from orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated insert to orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated update to orders" ON orders;

-- receipt_order_snapshots: Remove bypass policies
DROP POLICY IF EXISTS "Allow authenticated delete from receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Allow authenticated insert to receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Allow authenticated read access to receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Allow authenticated update to receipt_order_snapshots" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots delete" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots insert" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots select" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots update" ON receipt_order_snapshots;

-- receipt_orders: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow anonymous insert to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow anonymous read access to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow anonymous update to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow authenticated delete from receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow authenticated insert to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow authenticated read access to receipt_orders" ON receipt_orders;
DROP POLICY IF EXISTS "Allow authenticated update to receipt_orders" ON receipt_orders;

-- receipts: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from receipts" ON receipts;
DROP POLICY IF EXISTS "Allow anonymous insert to receipts" ON receipts;
DROP POLICY IF EXISTS "Allow anonymous read access to receipts" ON receipts;
DROP POLICY IF EXISTS "Allow anonymous update to receipts" ON receipts;
DROP POLICY IF EXISTS "Allow authenticated delete from receipts" ON receipts;
DROP POLICY IF EXISTS "Allow authenticated insert to receipts" ON receipts;
DROP POLICY IF EXISTS "Allow authenticated read access to receipts" ON receipts;
DROP POLICY IF EXISTS "Allow authenticated update to receipts" ON receipts;

-- returns: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from returns" ON returns;
DROP POLICY IF EXISTS "Allow anonymous insert to returns" ON returns;
DROP POLICY IF EXISTS "Allow anonymous read access to returns" ON returns;
DROP POLICY IF EXISTS "Allow anonymous update to returns" ON returns;
DROP POLICY IF EXISTS "Allow authenticated delete from returns" ON returns;
DROP POLICY IF EXISTS "Allow authenticated insert to returns" ON returns;
DROP POLICY IF EXISTS "Allow authenticated read access to returns" ON returns;
DROP POLICY IF EXISTS "Allow authenticated update to returns" ON returns;

-- suppliers: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow anonymous insert to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow anonymous read access to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow anonymous update to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated delete from suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated insert to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated read access to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated update to suppliers" ON suppliers;

-- tariff_settings: Remove bypass policies
DROP POLICY IF EXISTS "Allow authenticated delete from tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Allow authenticated insert to tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Allow authenticated read access to tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Allow authenticated update to tariff_settings" ON tariff_settings;
DROP POLICY IF EXISTS "Anyone can insert tariff settings" ON tariff_settings;
DROP POLICY IF EXISTS "Anyone can read tariff settings" ON tariff_settings;
DROP POLICY IF EXISTS "Anyone can update tariff settings" ON tariff_settings;

-- transactions: Remove bypass policies
DROP POLICY IF EXISTS "Allow anonymous delete from transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anonymous insert to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anonymous read access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anonymous update to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated delete from transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated insert to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated read access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated update to transactions" ON transactions;

-- user_profiles: Remove bypass policies
DROP POLICY IF EXISTS "Allow anon to insert during signup" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated delete from user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated insert during signup" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated insert to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated read access to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated update to user_profiles" ON user_profiles;