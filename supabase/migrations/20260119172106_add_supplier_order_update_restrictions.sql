/*
  # Додати обмеження на оновлення замовлень для постачальника

  1. Створити функцію для перевірки дозволених змін
  2. Оновити політику UPDATE для постачальників
  
  Постачальник може оновлювати тільки:
  - cash_on_delivery для замовлень зі статусом 'чернетка' та payment_type = 'побранє' або 'самовивіз'
*/

-- Функція для перевірки чи може постачальник оновити замовлення
CREATE OR REPLACE FUNCTION can_supplier_update_order(
  order_id uuid,
  new_data jsonb
) RETURNS boolean AS $$
DECLARE
  order_record orders;
  allowed_fields text[] := ARRAY['cash_on_delivery'];
  field_name text;
BEGIN
  -- Отримати поточне замовлення
  SELECT * INTO order_record FROM orders WHERE id = order_id;
  
  -- Перевірити чи існує замовлення
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Перевірити статус замовлення
  IF order_record.status != 'чернетка' THEN
    RETURN false;
  END IF;
  
  -- Перевірити чи всі поля, що оновлюються, дозволені
  FOR field_name IN SELECT jsonb_object_keys(new_data)
  LOOP
    IF NOT (field_name = ANY(allowed_fields)) THEN
      RETURN false;
    END IF;
  END LOOP;
  
  -- Перевірити payment_type для cash_on_delivery
  IF new_data ? 'cash_on_delivery' THEN
    IF order_record.payment_type NOT IN ('побранє', 'самовивіз') THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Оновити політику UPDATE для постачальників
DROP POLICY IF EXISTS "Supplier can update orders" ON orders;

CREATE POLICY "Supplier can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
      AND user_profiles.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.user_id = auth.uid()
      AND user_project_access.project_id = orders.project_id
    )
    AND status = 'чернетка'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
      AND user_profiles.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.user_id = auth.uid()
      AND user_project_access.project_id = orders.project_id
    )
    AND status = 'чернетка'
  );