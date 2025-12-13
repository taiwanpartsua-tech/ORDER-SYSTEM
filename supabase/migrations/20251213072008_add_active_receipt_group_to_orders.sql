/*
  # Додавання поля active_receipt_group до замовлень

  ## Зміни
  
  1. Нове поле
    - Додається поле active_receipt_group до таблиці orders
    - Тип: text
    - Може бути NULL або мати значення 'cash_on_delivery' або 'paid'
    - Вказує до якої групи активної прийомки належить замовлення
  
  2. Логіка
    - Коли замовлення додається до активної прийомки, встановлюється active_receipt_group
    - При завантаженні сторінки замовлення з цим полем автоматично потрапляють в відповідну чернетку
    - При підтвердженні прийомки або видаленні з неї - поле очищується
*/

-- Додаємо поле active_receipt_group
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS active_receipt_group text 
CHECK (active_receipt_group IS NULL OR active_receipt_group IN ('cash_on_delivery', 'paid'));