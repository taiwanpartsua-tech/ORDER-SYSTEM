/*
  # Fix Security Issues - Part 1: Add Foreign Key Indexes

  1. Performance Improvements
    - Add indexes on all unindexed foreign keys
    - This dramatically improves query performance and JOIN operations

  2. Security Impact
    - Faster queries mean better performance for RLS policy checks
    - Prevents performance degradation as data grows
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_accepted_orders_order_id ON accepted_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_accepted_orders_receipt_id ON accepted_orders(receipt_id);
CREATE INDEX IF NOT EXISTS idx_accepted_orders_supplier_id ON accepted_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_active_receipts_supplier_id ON active_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_order_id ON card_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_project_id ON counterparties(project_id);
CREATE INDEX IF NOT EXISTS idx_draft_orders_counterparty_id ON draft_orders(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_draft_orders_manager_id ON draft_orders(manager_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_receipt_field_changes_changed_by ON receipt_field_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_receipt_order_snapshots_order_id ON receipt_order_snapshots(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_manager_id ON returns(manager_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_id ON transactions(receipt_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_invited_by ON user_profiles(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_project_access_granted_by ON user_project_access(granted_by);