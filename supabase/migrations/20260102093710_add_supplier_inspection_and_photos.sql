/*
  # Додавання функціоналу перевірки товару постачальником та фото

  1. Нові таблиці
    - `order_photos` - Фото замовлень від постачальника
      - `id` (uuid, primary key) - унікальний ідентифікатор
      - `order_id` (uuid) - посилання на замовлення
      - `photo_url` (text) - URL фото в Storage
      - `uploaded_by` (uuid) - користувач, який завантажив
      - `uploaded_at` (timestamptz) - час завантаження
      - `notes` (text) - примітки до фото

  2. Зміни в таблиці orders
    - Додано `supplier_inspection_status` - статус перевірки постачальником (ok, damaged, null)
    - Додано `supplier_notes` - примітки постачальника
    - Додано `inspection_date` - дата перевірки
    - Додано `inspected_by` - хто перевірив

  3. Storage
    - Створено bucket 'order-photos' для зберігання фото

  4. Безпека
    - Увімкнено RLS для таблиці order_photos
    - Додано політики для автентифікованих користувачів
    - Налаштовано політики для Storage bucket

  5. Важливі примітки
    - Постачальник може додавати необмежену кількість фото до одного замовлення
    - Фото зберігаються в Supabase Storage
    - Статус може бути: ok (все гаразд), damaged (виявлено пошкодження), null (не перевірено)
*/

-- Додавання полів до orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'supplier_inspection_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN supplier_inspection_status text CHECK (supplier_inspection_status IN ('ok', 'damaged'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'supplier_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN supplier_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inspection_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN inspection_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inspected_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN inspected_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Створення таблиці order_photos
CREATE TABLE IF NOT EXISTS order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON order_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_order_photos_uploaded_by ON order_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_orders_inspection_status ON orders(supplier_inspection_status);
CREATE INDEX IF NOT EXISTS idx_orders_inspected_by ON orders(inspected_by);

-- Увімкнути RLS для order_photos
ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;

-- Політики для order_photos
CREATE POLICY "Authenticated users can view order photos"
  ON order_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert order photos"
  ON order_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order photos"
  ON order_photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order photos"
  ON order_photos FOR DELETE
  TO authenticated
  USING (true);

-- Створення Storage bucket для фото замовлень (якщо не існує)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-photos', 'order-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Політики для Storage bucket
CREATE POLICY "Authenticated users can upload order photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-photos');

CREATE POLICY "Anyone can view order photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'order-photos');

CREATE POLICY "Authenticated users can update their order photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'order-photos')
  WITH CHECK (bucket_id = 'order-photos');

CREATE POLICY "Authenticated users can delete order photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-photos');