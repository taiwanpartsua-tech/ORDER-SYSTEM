/*
  # Оновлення обмежень для статусів та типів оплати

  ## Опис
  Ця міграція оновлює CHECK-обмеження для полів status та payment_type,
  щоб вони відповідали українським значенням, які використовуються в інтерфейсі.

  ## Зміни
  
  ### Поле status
  Видаляє старе обмеження і додає нове з українськими статусами:
  - 'в роботі на сьогодні'
  - 'на броні'
  - 'очікується'
  - 'прийнято сьогодні'
  - 'на складі'
  - 'в дорозі'
  - 'в вигрузці'
  - 'готово до відправки'
  - 'повернення'
  - 'проблемні'
  - 'анульовано'
  
  ### Поле payment_type
  Видаляє старе обмеження і додає нове з українськими типами оплати:
  - 'оплачено'
  - 'побранє'
  - 'самовивіз pl'
  
  ### Оновлення значень за замовчуванням
  - status: 'в роботі на сьогодні' (замість 'pending')
  - payment_type: 'оплачено' (замість 'cash')
*/

-- Видалення старого обмеження для status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Додавання нового обмеження для status з українськими значеннями
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'в роботі на сьогодні',
    'на броні',
    'очікується',
    'прийнято сьогодні',
    'на складі',
    'в дорозі',
    'в вигрузці',
    'готово до відправки',
    'повернення',
    'проблемні',
    'анульовано'
  ));

-- Оновлення значення за замовчуванням для status
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'в роботі на сьогодні';

-- Видалення старого обмеження для payment_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_type_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_type_check;
  END IF;
END $$;

-- Додавання нового обмеження для payment_type з українськими значеннями
ALTER TABLE orders ADD CONSTRAINT orders_payment_type_check 
  CHECK (payment_type IN (
    'оплачено',
    'побранє',
    'самовивіз pl'
  ));

-- Оновлення значення за замовчуванням для payment_type
ALTER TABLE orders ALTER COLUMN payment_type SET DEFAULT 'оплачено';