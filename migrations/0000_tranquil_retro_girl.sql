DO $$ BEGIN
  CREATE TYPE "public"."deposit_status" AS ENUM('PENDING', 'CONFIRMED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."order_status" AS ENUM('DRAFT', 'CONFIRMED', 'ASSIGNED', 'DELIVERED', 'CLOSED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."role" AS ENUM('ADMIN', 'SUB_ADMIN', 'DRIVER', 'SALES');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."transaction_type" AS ENUM('CASH_SALE', 'CREDIT_SALE', 'RETURN', 'FREE_DISTRIBUTION', 'FREE_SAMPLE', 'DAMAGED', 'EXPENSE', 'DRIVER_DEBT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bakery_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"expense_date" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_deposits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "deposit_status" DEFAULT 'PENDING' NOT NULL,
	"deposit_date" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"confirmed_by" varchar,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_debts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"driver_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"is_paid" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"location_url" text,
	"route_id" varchar,
	"driver_id" varchar,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_balance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"cash_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "driver_balance_driver_id_unique" UNIQUE("driver_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_inventory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'bg-gray-100 text-gray-800' NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" integer NOT NULL,
	"received_quantity" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"date" text NOT NULL,
	"status" "order_status" DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"batch_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"driver_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"type" "transaction_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'SALES' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bakery_expenses" ADD CONSTRAINT "bakery_expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bakery_expenses" ADD CONSTRAINT "bakery_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_debts" ADD CONSTRAINT "customer_debts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_debts" ADD CONSTRAINT "customer_debts_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customers" ADD CONSTRAINT "customers_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customers" ADD CONSTRAINT "customers_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "driver_balance" ADD CONSTRAINT "driver_balance_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "driver_inventory" ADD CONSTRAINT "driver_inventory_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "driver_inventory" ADD CONSTRAINT "driver_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
