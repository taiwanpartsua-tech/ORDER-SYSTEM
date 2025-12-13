/*
  # Додати тип розрахунку до накладних
  
  1. Зміни
    - Додається поле `settlement_type` до таблиці `active_receipts`
    - Можливі значення: 'cash' (готівка/перекази), 'card' (картки), null (не розраховано)
  
  2. Причина
    - Розділити накладні між вкладками "Взаєморозрахунок" та "Взаєморозрахунок по картках"
    - Кожна накладна розраховується або по готівці, або по картці, але не одночасно
*/

-- Додати поле settlement_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_receipts' AND column_name = 'settlement_type'
  ) THEN
    ALTER TABLE active_receipts 
    ADD COLUMN settlement_type text CHECK (settlement_type IN ('cash', 'card'));
  END IF;
END $$;

-- Створити індекс для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_active_receipts_settlement_type 
ON active_receipts(settlement_type) 
WHERE settlement_type IS NOT NULL;