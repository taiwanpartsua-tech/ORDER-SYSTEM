/*
  # Add archived field to orders table

  1. Changes
    - Add `archived` boolean field to `orders` table (default: false)
    - Add `archived_at` timestamp field to track when order was archived
    - Create index on archived field for better query performance
  
  2. Purpose
    - Enable archiving orders instead of deleting them
    - Preserve order history for reference
    - Allow filtering between active and archived orders
*/

-- Add archived field to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'archived'
  ) THEN
    ALTER TABLE orders ADD COLUMN archived boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add archived_at timestamp field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);