/*
  # Зробити поля замовлення необов'язковими

  ## Зміни
  
  1. Змінюємо поле `order_number`:
    - Прибираємо обмеження NOT NULL
    - Дозволяємо створювати замовлення без номера
  
  2. Залишаємо UNIQUE constraint для випадків, коли номер вказаний
  
  ## Примітки
  - Тепер можна створити замовлення, заповнивши тільки одне поле
  - Всі поля стають необов'язковими
*/

-- Прибираємо NOT NULL constraint з order_number
ALTER TABLE orders 
  ALTER COLUMN order_number DROP NOT NULL;

-- Встановлюємо значення за замовчуванням
ALTER TABLE orders 
  ALTER COLUMN order_number SET DEFAULT '';
