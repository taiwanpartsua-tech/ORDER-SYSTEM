/*
  # Add "Paid by Transfer" Payment Type

  1. Changes
    - Add "оплачено по перерахунку" payment type to orders table
    - This status is used when cash_on_delivery payment has been realized and can be 0
  
  2. Notes
    - "не обрано" already exists as default
    - This allows more flexibility for payment tracking
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_type_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_type_check 
  CHECK (payment_type IN ('готівка', 'банк карта', 'оплачено', 'самовивіз', 'побранє', 'не обрано', 'оплачено по перерахунку'));