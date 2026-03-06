import { runMigrations } from "./migrate";

(async () => {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
})();
