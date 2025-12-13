-- Add "прийнято" status to orders table
-- 
-- This migration adds the "прийнято" (accepted) status to the orders table
-- This status is used when orders are approved through receipts

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
      status IN (
        'в роботі на сьогодні',
        'замовлено не оплачено',
        'замовлено оплачено',
        'відправлено',
        'на звірці',
        'прийнято сьогодні',
        'прийнято',
        'в активному прийомі',
        'готово до відправки',
        'на складі',
        'очікується',
        'повернення',
        'проблемні'
      )
    );
  END IF;
END $$;