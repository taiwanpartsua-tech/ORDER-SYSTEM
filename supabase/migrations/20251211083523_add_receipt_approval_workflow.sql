/*
  # Add Receipt Approval Workflow

  1. Changes
    - Extend `status` column in active_receipts table with new workflow stages:
      - 'draft' - активна прийомка, формується нами
      - 'pending_supplier' - відправлено постачальнику на звірку
      - 'supplier_approved' - постачальник затвердив після коригування
      - 'confirmed' - ми затвердили, записано в баланси
    - Add `supplier_notes` column for supplier comments during approval
    - Add `approved_by_supplier_at` timestamp
    - Add `confirmed_by_us_at` timestamp
    - Add `supplier_id` to link receipt with supplier
    
  2. Security
    - Update RLS policies as needed
    
  3. Notes
    - Existing receipts with 'approved' status will be set to 'confirmed'
    - New receipts start as 'draft'
    - Only 'confirmed' receipts affect supplier balances
*/

ALTER TABLE active_receipts DROP CONSTRAINT IF EXISTS active_receipts_status_check;

UPDATE active_receipts SET status = 'confirmed' WHERE status = 'approved';

ALTER TABLE active_receipts ADD CONSTRAINT active_receipts_status_check 
  CHECK (status IN ('draft', 'pending_supplier', 'supplier_approved', 'confirmed'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'supplier_notes'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN supplier_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'approved_by_supplier_at'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN approved_by_supplier_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'confirmed_by_us_at'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN confirmed_by_us_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
  END IF;
END $$;