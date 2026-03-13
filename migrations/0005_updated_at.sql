ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE "customer_debts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE "cash_deposits" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE "driver_inventory" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE "driver_balance" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE "bakery_expenses" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customers_updated_at') THEN
    CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transactions_updated_at') THEN
    CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customer_debts_updated_at') THEN
    CREATE TRIGGER trg_customer_debts_updated_at BEFORE UPDATE ON customer_debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cash_deposits_updated_at') THEN
    CREATE TRIGGER trg_cash_deposits_updated_at BEFORE UPDATE ON cash_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_driver_inventory_updated_at') THEN
    CREATE TRIGGER trg_driver_inventory_updated_at BEFORE UPDATE ON driver_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_driver_balance_updated_at') THEN
    CREATE TRIGGER trg_driver_balance_updated_at BEFORE UPDATE ON driver_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bakery_expenses_updated_at') THEN
    CREATE TRIGGER trg_bakery_expenses_updated_at BEFORE UPDATE ON bakery_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
