/*
  # Збільшення розміру числових полів в інших таблицях

  ## Опис
  Ця міграція збільшує розмір числових полів у таблицях suppliers, active_receipts, 
  receipt_items та supplier_transactions для узгодженості з таблицею orders.

  ## Зміни
  
  ### Таблиця suppliers
  - balance: decimal(10,2) -> decimal(15,2)
  - balance_pln: decimal(10,2) -> decimal(15,2)
  - balance_usd: decimal(10,2) -> decimal(15,2)
  
  ### Таблиця active_receipts
  - total_pln: decimal(10,2) -> decimal(15,2)
  - total_usd: decimal(10,2) -> decimal(15,2)
  
  ### Таблиця receipt_items
  - price_pln: decimal(10,2) -> decimal(15,2)
  - price_usd: decimal(10,2) -> decimal(15,2)
  - total_pln: decimal(10,2) -> decimal(15,2)
  - total_usd: decimal(10,2) -> decimal(15,2)
  
  ### Таблиця supplier_transactions
  - amount_pln: decimal(10,2) -> decimal(15,2)
  - amount_usd: decimal(10,2) -> decimal(15,2)
*/

-- Таблиця suppliers
ALTER TABLE suppliers ALTER COLUMN balance TYPE decimal(15,2);
ALTER TABLE suppliers ALTER COLUMN balance_pln TYPE decimal(15,2);
ALTER TABLE suppliers ALTER COLUMN balance_usd TYPE decimal(15,2);

-- Таблиця active_receipts
ALTER TABLE active_receipts ALTER COLUMN total_pln TYPE decimal(15,2);
ALTER TABLE active_receipts ALTER COLUMN total_usd TYPE decimal(15,2);

-- Таблиця receipt_items
ALTER TABLE receipt_items ALTER COLUMN price_pln TYPE decimal(15,2);
ALTER TABLE receipt_items ALTER COLUMN price_usd TYPE decimal(15,2);
ALTER TABLE receipt_items ALTER COLUMN total_pln TYPE decimal(15,2);
ALTER TABLE receipt_items ALTER COLUMN total_usd TYPE decimal(15,2);

-- Таблиця supplier_transactions
ALTER TABLE supplier_transactions ALTER COLUMN amount_pln TYPE decimal(15,2);
ALTER TABLE supplier_transactions ALTER COLUMN amount_usd TYPE decimal(15,2);