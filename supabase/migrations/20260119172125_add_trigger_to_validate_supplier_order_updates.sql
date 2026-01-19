/*
  # Додати тригер для валідації оновлень замовлень постачальником

  1. Створити функцію тригера для перевірки оновлень
  2. Додати тригер на таблицю orders
  
  Тригер перевіряє, що постачальник може оновлювати тільки:
  - cash_on_delivery для замовлень зі статусом 'чернетка' та payment_type = 'побранє' або 'самовивіз'
*/

-- Функція тригера для валідації оновлень постачальника
CREATE OR REPLACE FUNCTION validate_supplier_order_update()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
BEGIN
  -- Отримати роль користувача
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Якщо це не постачальник, дозволити всі оновлення
  IF user_role != 'supplier' THEN
    RETURN NEW;
  END IF;
  
  -- Постачальник: перевірити статус замовлення
  IF OLD.status != 'чернетка' THEN
    RAISE EXCEPTION 'Постачальник може оновлювати тільки замовлення зі статусом "чернетка"';
  END IF;
  
  -- Перевірити, які поля змінюються
  IF OLD.part_price IS DISTINCT FROM NEW.part_price THEN
    RAISE EXCEPTION 'Постачальник не може змінювати вартість запчастини';
  END IF;
  
  IF OLD.delivery_cost IS DISTINCT FROM NEW.delivery_cost THEN
    RAISE EXCEPTION 'Постачальник не може змінювати вартість доставки';
  END IF;
  
  IF OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN
    RAISE EXCEPTION 'Постачальник не може змінювати вагу';
  END IF;
  
  IF OLD.transport_cost_usd IS DISTINCT FROM NEW.transport_cost_usd THEN
    RAISE EXCEPTION 'Постачальник не може змінювати вартість транспорту';
  END IF;
  
  IF OLD.received_pln IS DISTINCT FROM NEW.received_pln THEN
    RAISE EXCEPTION 'Постачальник не може змінювати отримано PLN';
  END IF;
  
  IF OLD.total_cost IS DISTINCT FROM NEW.total_cost THEN
    RAISE EXCEPTION 'Постачальник не може змінювати загальну вартість';
  END IF;
  
  -- Перевірити зміну cash_on_delivery
  IF OLD.cash_on_delivery IS DISTINCT FROM NEW.cash_on_delivery THEN
    IF OLD.payment_type NOT IN ('побранє', 'самовивіз') THEN
      RAISE EXCEPTION 'Побраня можна редагувати тільки для замовлень з типом оплати "побранє" або "самовивіз"';
    END IF;
  END IF;
  
  -- Перевірити зміни в інших важливих полях
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'Постачальник не може змінювати статус замовлення';
  END IF;
  
  IF OLD.payment_type IS DISTINCT FROM NEW.payment_type THEN
    RAISE EXCEPTION 'Постачальник не може змінювати тип оплати';
  END IF;
  
  IF OLD.verified IS DISTINCT FROM NEW.verified THEN
    RAISE EXCEPTION 'Постачальник не може змінювати статус верифікації';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Додати тригер на таблицю orders
DROP TRIGGER IF EXISTS validate_supplier_order_update_trigger ON orders;

CREATE TRIGGER validate_supplier_order_update_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_supplier_order_update();