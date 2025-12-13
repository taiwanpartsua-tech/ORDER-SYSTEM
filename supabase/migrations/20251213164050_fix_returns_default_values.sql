/*
  # Fix returns table default values
  
  1. Changes
    - Change default value for `status` from 'pending' to 'повернення'
    - Change default value for `refund_status` from 'pending' to '' (empty string)
  
  2. Reasoning
    - Current default value 'pending' for refund_status violates the check constraint
    - The constraint only allows: NULL, '', 'оплачено поляком', 'надіслано реквізити для повернення', 'кошти повернено'
    - Status should default to 'повернення' to match the application logic
*/

-- Change default value for status to match the application logic
ALTER TABLE returns ALTER COLUMN status SET DEFAULT 'повернення';

-- Change default value for refund_status to empty string to comply with the constraint
ALTER TABLE returns ALTER COLUMN refund_status SET DEFAULT '';
