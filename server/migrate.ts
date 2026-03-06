import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";

export async function runMigrations() {
  console.log("Running database migrations...");
  const maxRetries = 10;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await migrate(db, { migrationsFolder: "./migrations" });
      console.log("Migrations completed successfully");
      return;
    } catch (error: any) {
      if (attempt < maxRetries && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === '57P03')) {
        console.log(`Database not ready (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error("Migration failed:", error);
        throw error;
      }
    }
  }
}
