/*
  # Створення постачальника ART TRANS за замовчуванням

  ## Зміни
  1. Створюємо постачальника "ART TRANS" з фіксованим UUID
  2. Встановлюємо його як значення за замовчуванням для нових замовлень

  ## Примітки
  - Постачальник створюється з фіксованим UUID для можливості використання як DEFAULT
  - Всі нові замовлення автоматично будуть прив'язані до ART TRANS
*/

-- Створення постачальника ART TRANS з фіксованим UUID
INSERT INTO suppliers (
  id,
  name,
  total_orders,
  completed_orders,
  balance,
  total_debt,
  cash_balance,
  card_balance,
  pending_receipt_balance
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ART TRANS',
  0,
  0,
  0,
  0,
  0,
  0,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Встановлення ART TRANS як значення за замовчуванням для supplier_id
ALTER TABLE orders 
ALTER COLUMN supplier_id 
SET DEFAULT '00000000-0000-0000-0000-000000000001';