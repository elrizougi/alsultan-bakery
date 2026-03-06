ALTER TABLE "customers" ALTER COLUMN "address" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;