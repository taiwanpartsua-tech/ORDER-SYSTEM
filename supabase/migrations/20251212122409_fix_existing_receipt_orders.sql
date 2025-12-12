/*
  # Відновлення записів receipt_orders на основі snapshots

  1. Зміни
    - Додаємо записи в receipt_orders на основі існуючих receipt_order_snapshots
    - Розраховуємо amount як суму original_part_price + original_delivery_cost

  2. Примітка
    - Ця міграція виправляє існуючі прийомки які були створені без записів receipt_orders
*/

-- Додаємо записи в receipt_orders на основі snapshots
INSERT INTO receipt_orders (receipt_id, order_id, amount)
SELECT 
  ros.receipt_id,
  ros.order_id,
  ros.original_part_price + ros.original_delivery_cost as amount
FROM receipt_order_snapshots ros
WHERE NOT EXISTS (
  SELECT 1 FROM receipt_orders ro
  WHERE ro.receipt_id = ros.receipt_id
  AND ro.order_id = ros.order_id
);