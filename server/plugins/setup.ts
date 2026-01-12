import { env } from "!/env";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { definePlugin } from "nitro";
import postgres from "postgres";

async function runMigrations() {
  console.log("🔧 Setting up database schema...");

  const pgClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    const db = drizzle(pgClient);

    await pgClient`CREATE SCHEMA IF NOT EXISTS workflow`;

    const migrationsFolder = path.join(process.cwd(), "drizzle");
    console.log(`📂 Running migrations from: ${migrationsFolder}`);

    await migrate(db, {
      migrationsFolder,
      migrationsTable: "migrations",
    });

    console.log("✅ Database migrations completed!");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error);
    process.exit(0);
  } finally {
    await pgClient.end();
  }
}

export default definePlugin(async () => {
  // 启动时执行迁移
  await runMigrations();

  if (process.env.WORKFLOW_TARGET_WORLD === "@workflow/world-postgres") {
    console.log("Starting Postgres World...");

    const { getWorld } = await import("workflow/runtime");
    await getWorld().start?.();
    console.log("Postgres World started");
  }

  // nitroApp.hooks.hook("request", async () => {});
});
