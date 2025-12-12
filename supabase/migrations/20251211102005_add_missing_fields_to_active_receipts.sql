/*
  # Add Missing Fields to Active Receipts

  1. Changes
    - Add `supplier_id` field to link receipts with suppliers
    - Add cost breakdown fields:
      - `parts_cost_pln` - cost of parts in PLN
      - `delivery_cost_pln` - delivery cost in PLN
      - `receipt_cost_pln` - receiving cost in PLN
      - `cash_on_delivery_pln` - cash on delivery in PLN
      - `transport_cost_usd` - transport cost in USD
    - Add workflow fields:
      - `supplier_notes` - notes from supplier
      - `approved_by_supplier_at` - timestamp when supplier approved
      - `confirmed_by_us_at` - timestamp when we confirmed
    
  2. Security
    - Update foreign key constraints
    - Maintain existing RLS policies
*/

DO $$
BEGIN
  -- Add supplier_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
  END IF;

  -- Add cost breakdown fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'parts_cost_pln'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN parts_cost_pln numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'delivery_cost_pln'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN delivery_cost_pln numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'receipt_cost_pln'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN receipt_cost_pln numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'cash_on_delivery_pln'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN cash_on_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'transport_cost_usd'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN transport_cost_usd numeric(15,2) DEFAULT 0;
  END IF;

  -- Add workflow fields
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
END $$;

-- Update status constraint if needed
ALTER TABLE active_receipts DROP CONSTRAINT IF EXISTS active_receipts_status_check;
ALTER TABLE active_receipts ADD CONSTRAINT active_receipts_status_check 
  CHECK (status IN ('draft', 'pending_supplier', 'supplier_approved', 'confirmed'));