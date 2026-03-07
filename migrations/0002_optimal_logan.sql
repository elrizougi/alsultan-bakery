ALTER TABLE "bakery_expenses" ADD COLUMN IF NOT EXISTS "receipt_image" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "receipt_image" text;