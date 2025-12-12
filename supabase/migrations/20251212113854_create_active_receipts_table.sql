/*
  # Створення таблиці active_receipts

  1. Нова таблиця
    - `active_receipts` - Активні прийомки товарів
      - `id` (uuid, primary key) - унікальний ідентифікатор
      - `receipt_number` (text) - номер прийомки
      - `receipt_date` (date) - дата прийомки
      - `status` (text) - статус прийомки (draft/approved/sent_for_settlement/settled)
      - `supplier_id` (uuid) - посилання на постачальника
      - `total_pln` (numeric) - загальна сума в злотих
      - `total_usd` (numeric) - загальна сума в доларах
      - `parts_cost_pln` (numeric) - вартість запчастин в злотих
      - `delivery_cost_pln` (numeric) - вартість доставки в злотих
      - `receipt_cost_pln` (numeric) - прийом в злотих
      - `cash_on_delivery_pln` (numeric) - побранє в злотих
      - `transport_cost_usd` (numeric) - вартість транспорту в доларах
      - `approved_at` (timestamptz) - час затвердження
      - `settlement_date` (timestamptz) - дата відправки на розрахунки
      - `settled_date` (timestamptz) - дата розрахунку
      - `created_at` (timestamptz) - дата створення

  2. Безпека
    - Увімкнено RLS для таблиці active_receipts
    - Додано політики для анонімного та автентифікованого доступу
*/

-- Створюємо таблицю active_receipts
CREATE TABLE IF NOT EXISTS active_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL,
  receipt_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent_for_settlement', 'settled')),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  total_pln numeric(15,2) DEFAULT 0,
  total_usd numeric(15,2) DEFAULT 0,
  parts_cost_pln numeric(15,2) DEFAULT 0,
  delivery_cost_pln numeric(15,2) DEFAULT 0,
  receipt_cost_pln numeric(15,2) DEFAULT 0,
  cash_on_delivery_pln numeric(15,2) DEFAULT 0,
  transport_cost_usd numeric(15,2) DEFAULT 0,
  approved_at timestamptz,
  settlement_date timestamptz,
  settled_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Увімкнути RLS
ALTER TABLE active_receipts ENABLE ROW LEVEL SECURITY;

-- Політики для публічного доступу
CREATE POLICY "Public access to active_receipts select"
  ON active_receipts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to active_receipts insert"
  ON active_receipts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to active_receipts update"
  ON active_receipts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to active_receipts delete"
  ON active_receipts FOR DELETE
  TO anon, authenticated
  USING (true);