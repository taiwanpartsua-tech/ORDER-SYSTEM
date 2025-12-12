/*
  # Add refund tracking and manager fields to returns

  1. New Tables
    - `managers`
      - `id` (uuid, primary key)
      - `name` (text, unique) - manager name for tag selection
      - `created_at` (timestamp)
  
  2. Changes to `returns` table
    - Add `refund_status` (text) - tracks refund status with options:
      * "оплачено поляком"
      * "надіслано реквізити для повернення"
      * "кошти повернено"
    - Add `discussion_link` (text) - link to discussion
    - Add `situation_description` (text) - description of the situation
    - Add `manager_id` (uuid, foreign key) - reference to manager
  
  3. Security
    - Enable RLS on `managers` table
    - Add policy for public read access to managers
    - Add policy for public insert/update/delete access to managers (for tag functionality)
*/

-- Create managers table
CREATE TABLE IF NOT EXISTS managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view managers"
  ON managers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert managers"
  ON managers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update managers"
  ON managers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete managers"
  ON managers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Add new fields to returns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'refund_status'
  ) THEN
    ALTER TABLE returns ADD COLUMN refund_status text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'discussion_link'
  ) THEN
    ALTER TABLE returns ADD COLUMN discussion_link text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'situation_description'
  ) THEN
    ALTER TABLE returns ADD COLUMN situation_description text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE returns ADD COLUMN manager_id uuid REFERENCES managers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for refund_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'returns' AND constraint_name = 'returns_refund_status_check'
  ) THEN
    ALTER TABLE returns ADD CONSTRAINT returns_refund_status_check 
      CHECK (refund_status IS NULL OR refund_status IN ('оплачено поляком', 'надіслано реквізити для повернення', 'кошти повернено'));
  END IF;
END $$;