-- Ensure only one "بيع مباشر" customer can exist (unique partial index)
CREATE UNIQUE INDEX IF NOT EXISTS customers_unique_direct_sale
  ON customers (is_direct_sale)
  WHERE is_direct_sale = true;
