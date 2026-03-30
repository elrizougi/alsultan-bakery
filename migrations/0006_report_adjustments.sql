-- Migration: Add isDirectSale to customers and create report_adjustments table

-- Add is_direct_sale column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_direct_sale BOOLEAN NOT NULL DEFAULT FALSE;

-- Create report_adjustments table
CREATE TABLE IF NOT EXISTS report_adjustments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id VARCHAR NOT NULL REFERENCES users(id),
  report_date TEXT NOT NULL,
  customer_id VARCHAR NOT NULL REFERENCES customers(id),
  white_bread INTEGER NOT NULL DEFAULT 0,
  brown_bread INTEGER NOT NULL DEFAULT 0,
  medium INTEGER NOT NULL DEFAULT 0,
  super_bread INTEGER NOT NULL DEFAULT 0,
  wrapped INTEGER NOT NULL DEFAULT 0,
  returned INTEGER NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, report_date, customer_id)
);
