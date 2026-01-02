/*
  # Create Receipt Field Changes History Table

  1. New Tables
    - `receipt_field_changes`
      - `id` (uuid, primary key)
      - `receipt_id` (uuid, foreign key to active_receipts)
      - `order_id` (uuid, foreign key to orders)
      - `field_name` (text) - name of the field that was changed
      - `old_value` (text) - previous value (stored as text for flexibility)
      - `new_value` (text) - new value (stored as text for flexibility)
      - `changed_by` (uuid, foreign key to user_profiles)
      - `changed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `receipt_field_changes` table
    - Add policy for authenticated users to read all changes
    - Add policy for authenticated users to insert changes

  3. Indexes
    - Index on receipt_id for faster lookups
    - Index on order_id for filtering by order
    - Index on changed_at for sorting
*/

CREATE TABLE IF NOT EXISTS receipt_field_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES user_profiles(id),
  changed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receipt_field_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receipt field changes"
  ON receipt_field_changes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert receipt field changes"
  ON receipt_field_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipt_field_changes_receipt_id 
  ON receipt_field_changes(receipt_id);

CREATE INDEX IF NOT EXISTS idx_receipt_field_changes_order_id 
  ON receipt_field_changes(order_id);

CREATE INDEX IF NOT EXISTS idx_receipt_field_changes_changed_at 
  ON receipt_field_changes(changed_at DESC);