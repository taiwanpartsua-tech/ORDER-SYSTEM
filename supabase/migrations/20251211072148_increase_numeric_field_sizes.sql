/*
  # Збільшення розміру числових полів

  ## Опис
  Ця міграція збільшує розмір числових полів у таблиці orders для підтримки більших значень.

  ## Зміни
  Змінює тип даних з decimal(10,2) на decimal(15,2) для полів:
  - part_price (вартість запчастини)
  - delivery_cost (вартість доставки)
  - total_cost (загальна вартість)
  - cash_on_delivery (побранє)
  - received_pln (прийом в злотих)
  - transport_cost_usd (перевезення в доларах)
  - weight_kg (вага в кілограмах)
  
  Це дозволить зберігати значення до 9,999,999,999,999.99
*/

-- Збільшення розміру числових полів
ALTER TABLE orders ALTER COLUMN part_price TYPE decimal(15,2);
ALTER TABLE orders ALTER COLUMN delivery_cost TYPE decimal(15,2);
ALTER TABLE orders ALTER COLUMN total_cost TYPE decimal(15,2);
ALTER TABLE orders ALTER COLUMN cash_on_delivery TYPE decimal(15,2);
ALTER TABLE orders ALTER COLUMN received_pln TYPE decimal(15,2);
ALTER TABLE orders ALTER COLUMN transport_cost_usd TYPE decimal(15,2);
ALTER TABLE orders ALTER COLUMN weight_kg TYPE decimal(15,2);